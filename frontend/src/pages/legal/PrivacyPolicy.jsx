import LegalLayout from "./LegalLayout.jsx";

function H({ children }) {
  return <h2 className="pt-2 font-display text-lg font-semibold text-slate-100">{children}</h2>;
}

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 2026">
      <p>
        This Privacy Policy explains what information Decentralized World (the
        &ldquo;Platform&rdquo;) processes when you use the application, and how that
        information is handled. By connecting a wallet and using the Platform, you agree
        to the practices described here.
      </p>

      <H>1. Wallet-based access</H>
      <p>
        The Platform is wallet-based. It does not ask for and does not require a name,
        email address, phone number, or any government identity document to create or use
        an account. Your identity on the Platform is your blockchain wallet address.
      </p>

      <H>2. Information we process</H>
      <p>
        We process the public wallet address you connect, along with data associated with
        that address that is already publicly visible on the blockchain. We also store
        activity generated inside the Platform, including your referral code, referral
        relationships, plan-activation status, level, reward accrual, and withdrawal
        requests.
      </p>

      <H>3. Information we do not collect</H>
      <p>
        We do not collect personal identifiers such as your legal name, email, postal
        address, phone number, or biometric data. We do not run advertising trackers and
        we do not sell data. Because access is wallet-only, we cannot recover an account
        by email or phone.
      </p>

      <H>4. Blockchain data is public and permanent</H>
      <p>
        Payments submitted to the blockchain are recorded on a public ledger that is
        outside the Platform&rsquo;s control. Such records are permanent, cannot be edited
        or deleted by us, and may be viewed by anyone. You should treat all such activity
        as public.
      </p>

      <H>5. How information is used</H>
      <p>
        Information is used to operate the Platform: to verify wallet ownership, to
        maintain your referral tree and level, to calculate rewards, and to process
        withdrawal requests. On-chain verification is used to confirm that a connected
        wallet is genuine before an account is allowed to proceed.
      </p>

      <H>6. Data retention</H>
      <p>
        Platform activity records are retained for as long as the Platform operates or as
        needed to provide its functionality. On-chain records persist independently on the
        blockchain regardless of the Platform.
      </p>

      <H>7. Security</H>
      <p>
        We take reasonable measures to protect the information stored by the Platform.
        However, no method of transmission or storage is completely secure. You are solely
        responsible for the security of your wallet, private keys, and seed phrase. We
        never ask for your private key or seed phrase, and you should never share them.
      </p>

      <H>8. Changes to this policy</H>
      <p>
        This policy may be updated from time to time. Continued use of the Platform after
        an update constitutes acceptance of the revised policy.
      </p>
    </LegalLayout>
  );
}
