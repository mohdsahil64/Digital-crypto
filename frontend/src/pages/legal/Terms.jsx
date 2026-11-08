import LegalLayout from "./LegalLayout.jsx";

function H({ children }) {
  return <h2 className="pt-2 font-display text-lg font-semibold text-slate-100">{children}</h2>;
}

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="September 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of
        Decentralized World (the &ldquo;Platform&rdquo;). By connecting a wallet and using
        the Platform, you accept these Terms in full. If you do not agree, do not use the
        Platform.
      </p>

      <H>1. Eligibility</H>
      <p>
        You must be of legal age in your jurisdiction and legally permitted to use
        blockchain-based applications and digital assets. You are responsible for ensuring
        that your use of the Platform is lawful where you live. The Platform may not be
        available or lawful in every jurisdiction.
      </p>

      <H>2. Wallet-based accounts</H>
      <p>
        Access is provided solely through a self-custodial blockchain wallet. You are the
        sole custodian of your wallet and are fully responsible for its security. Any
        action taken through a connected wallet is deemed to be authorized by you. Lost
        access to a wallet cannot be restored by the Platform.
      </p>

      <H>3. The plan and referral system</H>
      <p>
        The Platform offers a one-time plan activation paid in USDT and a single-leg
        referral structure. Referral counts and levels are credited only for participants
        who have activated the plan. Reward levels and daily reward values are defined
        inside the Platform and may be changed. Participation is voluntary.
      </p>

      <H>4. No guarantee of earnings</H>
      <p>
        The Platform does not promise or guarantee any income, profit, or return. Any
        rewards depend on network activity and the rules in effect at the time. Referral
        and level-based systems carry inherent risk, and it is possible to receive nothing
        in return for the plan fee.
      </p>

      <H>5. Transactions are final</H>
      <p>
        Blockchain transactions are irreversible. Once a payment or transfer is submitted
        and confirmed, it cannot be undone by the Platform. You are responsible for
        reviewing every transaction before you confirm it in your wallet.
      </p>

      <H>6. Prohibited use</H>
      <p>
        You agree not to use the Platform for unlawful purposes, not to attempt to
        manipulate the referral or reward system, not to use automated scripts or fake
        wallets, and not to interfere with the Platform&rsquo;s operation or security.
      </p>

      <H>7. Availability</H>
      <p>
        The Platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
        basis and may be modified, suspended, or discontinued at any time without notice.
        Maintenance periods may temporarily disable access.
      </p>

      <H>8. Limitation of liability</H>
      <p>
        To the maximum extent permitted by law, the Platform and its operators are not
        liable for any loss of funds, loss of data, lost profits, or any indirect or
        consequential damages arising from your use of the Platform, from blockchain
        network behavior, or from your own wallet management.
      </p>

      <H>9. Changes to these Terms</H>
      <p>
        These Terms may be updated at any time. Continued use after changes take effect
        constitutes acceptance of the updated Terms.
      </p>
    </LegalLayout>
  );
}
