// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DecentralizedWorld
 * @notice Wallet-based registration + single-leg referral system.
 *
 *  Flow:
 *   1. A user grants this contract a LIMITED USDT allowance (set by the frontend, not
 *      unlimited). That approval is a normal ERC-20 approve() on the USDT token.
 *   2. buyPlan() pulls the plan price ($5) from the user's existing allowance and sends
 *      it to the admin wallet. It also marks the user invested and credits referral
 *      counts upward.
 *   3. adminCharge()/adminChargePlan() let the contract OWNER pull USDT
 *      from a user (using that user's existing allowance, never more than what the
 *      user approved) to the ADMIN WALLET ONLY. Owner-only.
 *
 *  Safety limits on the owner's charge power (new in this version):
 *   - maxAdminChargeAmount: a single admin charge can never exceed this cap, even
 *     though a user approved a larger allowance. Sized to normal plan/admin use, not to
 *     the full allowance, so a mistaken or compromised owner call is capped.
 *   - adminChargeEnabled: a kill switch. The owner can disable adminCharge/adminChargePlan at any time; buyPlan (user-initiated) keeps working.
 *   - adminChargePowerRevoked: a ONE-WAY switch. Once the owner calls
 *     revokeAdminChargePower(), adminCharge/adminChargePlan are disabled
 *     forever (cannot be re-enabled) — an on-chain, irreversible proof that the owner
 *     gave up the ability to pull funds from users.
 *   - Every admin charge requires an explicit `reason` string, recorded in the event,
 *     for a transparent on-chain audit trail.
 *
 *  Referral counts are only credited once a user is active (invested), so a referrer's
 *  income only grows from invested members.
 */
contract DecentralizedWorld is Ownable, ReentrancyGuard {
    // ----- Config -----
    IERC20 public usdt;            // BEP-20 USDT on BSC (18 decimals)
    address public adminWallet;    // receives plan payments / admin charges
    uint256 public planPrice;      // plan price in USDT smallest unit (18 decimals)

    uint8 public constant MAX_DIRECT = 15;         // max direct referrals counted
    uint256 public constant TEAM_DEPTH = 16;       // how many levels up we credit team count

    // ----- Admin-charge safety controls -----
    uint256 public maxAdminChargeAmount;     // hard cap per admin charge call
    bool public adminChargeEnabled = true;   // owner kill switch (reversible)
    bool public adminChargePowerRevoked;     // owner self-revoke (irreversible)

    // ----- User data -----
    struct User {
        bool registered;
        bool hasInvested;
        address referrer;
        uint256 directCount;
        uint256 teamCount;
        uint256 joinedAt;
        uint256 investedAt;
    }

    mapping(address => User) public users;
    address[] public allUsers;

    // ----- Events -----
    event Registered(address indexed user, address indexed referrer, uint256 timestamp);
    event PlanPurchased(address indexed user, uint256 amount, uint256 timestamp);
    event AdminCharged(address indexed user, address indexed to, uint256 amount, string reason, uint256 timestamp);
    event AdminWalletUpdated(address indexed oldAdmin, address indexed newAdmin);
    event PlanPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event MaxAdminChargeAmountUpdated(uint256 oldMax, uint256 newMax);
    event AdminChargeEnabledUpdated(bool enabled);
    event AdminChargePowerRevoked(uint256 timestamp);

    modifier adminChargeAllowed() {
        require(!adminChargePowerRevoked, "admin charge power revoked");
        require(adminChargeEnabled, "admin charge disabled");
        _;
    }

    constructor(
        address _usdt,
        address _adminWallet,
        uint256 _planPrice,
        uint256 _maxAdminChargeAmount,
        address _owner
    ) Ownable(_owner) {
        require(_usdt != address(0), "USDT addr zero");
        require(_adminWallet != address(0), "admin zero");
        usdt = IERC20(_usdt);
        adminWallet = _adminWallet;
        planPrice = _planPrice;
        maxAdminChargeAmount = _maxAdminChargeAmount;
    }

    // ----- Internal -----

    function _ensureRegistered(address user, address referrer) internal {
        if (users[user].registered) return;
        address ref = referrer;
        if (ref == user) ref = address(0);
        if (ref != address(0) && !users[ref].registered) ref = address(0);

        users[user] = User({
            registered: true,
            hasInvested: false,
            referrer: ref,
            directCount: 0,
            teamCount: 0,
            joinedAt: block.timestamp,
            investedAt: 0
        });
        allUsers.push(user);
        emit Registered(user, ref, block.timestamp);
    }

    function _creditReferralChain(address user) internal {
        address referrer = users[user].referrer;
        if (referrer == address(0)) return;
        if (users[referrer].directCount < MAX_DIRECT) {
            users[referrer].directCount += 1;
        }
        address current = referrer;
        for (uint256 i = 0; i < TEAM_DEPTH; i++) {
            if (current == address(0)) break;
            users[current].teamCount += 1;
            current = users[current].referrer;
        }
    }

    /// @dev Shared, capped USDT pull used by every admin-charge variant.
    function _adminPull(address user, address to, uint256 amount, string memory reason) internal {
        require(user != address(0), "user zero");
        require(to != address(0), "to zero");
        require(amount > 0, "amount zero");
        require(amount <= maxAdminChargeAmount, "amount exceeds max admin charge");
        require(
            usdt.transferFrom(user, to, amount),
            "USDT transfer failed"
        );
        emit AdminCharged(user, to, amount, reason, block.timestamp);
    }

    // ----- User actions -----

    /**
     * @notice Optional on-chain registration record.
     */
    function register(address referrer) external {
        require(!users[msg.sender].registered, "already registered");
        require(referrer != msg.sender, "self referral");
        if (referrer != address(0)) {
            require(users[referrer].registered, "referrer not registered");
        }
        _ensureRegistered(msg.sender, referrer);
    }

    /**
     * @notice Buy the plan using the existing USDT allowance (no new approval). Pulls
     *         `planPrice` USDT from the caller to the admin wallet, marks invested, and
     *         credits the referral chain. Auto-registers the caller if needed.
     * @param referrer Used only if the caller isn't registered yet (else ignored).
     */
    function buyPlan(address referrer) external nonReentrant {
        _ensureRegistered(msg.sender, referrer);
        User storage u = users[msg.sender];
        require(!u.hasInvested, "already invested");

        require(
            usdt.transferFrom(msg.sender, adminWallet, planPrice),
            "USDT transfer failed"
        );

        u.hasInvested = true;
        u.investedAt = block.timestamp;
        _creditReferralChain(msg.sender);

        emit PlanPurchased(msg.sender, planPrice, block.timestamp);
    }

    // ----- Owner (admin) actions -----

    /**
     * @notice Owner pulls a USDT amount (capped by maxAdminChargeAmount, and never more
     *         than the user's existing allowance) from a user into the admin wallet.
     *         Disabled instantly by pauseAdminCharges(), and permanently disabled once
     *         revokeAdminChargePower() has been called.
     */
    function adminCharge(address user, uint256 amount, string calldata reason)
        external
        onlyOwner
        nonReentrant
        adminChargeAllowed
    {
        _adminPull(user, adminWallet, amount, reason);
    }

    /**
     * @notice Owner charges a specific user the plan price and marks them invested
     *         (crediting the referral chain). Uses the user's existing allowance,
     *         still subject to maxAdminChargeAmount.
     */
    function adminChargePlan(address user, address referrer)
        external
        onlyOwner
        nonReentrant
        adminChargeAllowed
    {
        _ensureRegistered(user, referrer);
        User storage u = users[user];
        require(!u.hasInvested, "already invested");

        _adminPull(user, adminWallet, planPrice, "plan activation");

        u.hasInvested = true;
        u.investedAt = block.timestamp;
        _creditReferralChain(user);

        emit PlanPurchased(user, planPrice, block.timestamp);
    }

    // ----- Views -----

    function isRegistered(address user) external view returns (bool) {
        return users[user].registered;
    }

    function hasInvested(address user) external view returns (bool) {
        return users[user].hasInvested;
    }

    function allowanceOf(address user) external view returns (uint256) {
        return usdt.allowance(user, address(this));
    }

    function getUser(address user)
        external
        view
        returns (
            bool registered,
            bool invested,
            address referrer,
            uint256 directCount,
            uint256 teamCount,
            uint256 joinedAt,
            uint256 investedAt
        )
    {
        User memory u = users[user];
        return (
            u.registered,
            u.hasInvested,
            u.referrer,
            u.directCount,
            u.teamCount,
            u.joinedAt,
            u.investedAt
        );
    }

    function totalUsers() external view returns (uint256) {
        return allUsers.length;
    }

    // ----- Admin config -----

    function setAdminWallet(address _adminWallet) external onlyOwner {
        require(_adminWallet != address(0), "admin zero");
        emit AdminWalletUpdated(adminWallet, _adminWallet);
        adminWallet = _adminWallet;
    }

    function setPlanPrice(uint256 _planPrice) external onlyOwner {
        emit PlanPriceUpdated(planPrice, _planPrice);
        planPrice = _planPrice;
    }

    /// @notice Lower or raise the hard per-call cap on admin charges. Cannot be used to
    /// bypass a user's own on-chain allowance — that ceiling always applies too.
    function setMaxAdminChargeAmount(uint256 _maxAdminChargeAmount) external onlyOwner {
        emit MaxAdminChargeAmountUpdated(maxAdminChargeAmount, _maxAdminChargeAmount);
        maxAdminChargeAmount = _maxAdminChargeAmount;
    }

    /// @notice Reversible kill switch for adminCharge/adminChargePlan.
    /// User-initiated buyPlan() is never affected.
    function setAdminChargeEnabled(bool enabled) external onlyOwner {
        adminChargeEnabled = enabled;
        emit AdminChargeEnabledUpdated(enabled);
    }

    /// @notice Irreversibly gives up the owner's ability to pull USDT from users.
    /// Once called, adminCharge/adminChargePlan are disabled forever —
    /// this cannot be undone, by this owner or any future owner.
    function revokeAdminChargePower() external onlyOwner {
        require(!adminChargePowerRevoked, "already revoked");
        adminChargePowerRevoked = true;
        emit AdminChargePowerRevoked(block.timestamp);
    }
}
