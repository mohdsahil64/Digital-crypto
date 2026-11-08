import LegalLayout from "./LegalLayout.jsx";

function H({ children }) {
  return <h2 className="pt-2 font-display text-lg font-semibold text-slate-100">{children}</h2>;
}

export default function RefundPolicy() {
  return (
    <LegalLayout title="USDT Payment & Refund Policy" updated="September 2026">
      <p>
        This policy explains how USDT payments work on Decentralized World (the
        &ldquo;Platform&rdquo;) and the Platform&rsquo;s position on refunds. By activating
        the plan or making any payment, you accept this policy.
      </p>

      <H>1. Payments are made in USDT</H>
      <p>
        All plan activations and on-Platform payments are settled in USDT on the supported
        network. You are responsible for holding sufficient USDT and any applicable network
        fee, and for using the correct network before transacting.
      </p>

      <H>2. All payments are final</H>
      <p>
        All payments made through the Platform are final. Once a plan fee or any payment is
        confirmed, it cannot be reversed, cancelled, or refunded by the Platform.
      </p>

      <H>3. No refunds</H>
      <p>
        The plan fee is non-refundable. This includes cases where you change your mind,
        do not refer anyone, do not reach a reward level, or stop using the Platform. By
        paying, you acknowledge that you may not receive any return and that no refund will
        be issued.
      </p>

      <H>4. Withdrawals</H>
      <p>
        Withdrawals of eligible rewards are subject to the minimum withdrawal amount and
        the balance available in your account. Withdrawal requests are reviewed and settled
        in USDT to your connected wallet address. Processing times may vary and are not
        guaranteed.
      </p>

      <H>5. Incorrect transactions</H>
      <p>
        The Platform cannot recover funds sent to an incorrect address, sent on an
        unsupported network, or lost due to wallet errors. You are responsible for
        verifying all transaction details before confirming them.
      </p>

      <H>6. Changes to this policy</H>
      <p>
        This policy may be updated at any time. Continued use of the Platform after an
        update constitutes acceptance of the revised policy.
      </p>
    </LegalLayout>
  );
}
