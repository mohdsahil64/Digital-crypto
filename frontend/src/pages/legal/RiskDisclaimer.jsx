import LegalLayout from "./LegalLayout.jsx";

function H({ children }) {
  return <h2 className="pt-2 font-display text-lg font-semibold text-slate-100">{children}</h2>;
}

export default function RiskDisclaimer() {
  return (
    <LegalLayout title="Risk Disclaimer" updated="September 2026">
      <p>
        This Risk Disclaimer describes the risks of using Decentralized World (the
        &ldquo;Platform&rdquo;) and interacting with digital assets. Read it carefully.
        Using the Platform means you understand and accept these risks.
      </p>

      <H>1. Not financial advice</H>
      <p>
        Nothing on the Platform is financial, investment, legal, or tax advice. The
        Platform does not act as your advisor. You are solely responsible for your own
        decisions and should consult independent professionals where appropriate.
      </p>

      <H>2. Volatility and loss</H>
      <p>
        Digital assets are highly volatile and can lose value rapidly. You may lose some
        or all of the funds you commit. Never commit funds you cannot afford to lose.
      </p>

      <H>3. Irreversible transactions</H>
      <p>
        Blockchain transactions cannot be reversed. Sending funds to a wrong address or
        confirming a transaction in error can lead to permanent, unrecoverable loss.
        Always verify details before you confirm.
      </p>

      <H>4. Referral and reward risk</H>
      <p>
        Rewards on the Platform depend on referral activity and team growth. There is no
        assurance that you will earn back the plan fee or receive any reward. Outcomes
        depend on factors outside your control, and participation may result in a net
        loss.
      </p>

      <H>5. Wallet and key risk</H>
      <p>
        You alone control your wallet. If your private key or seed phrase is lost, stolen,
        or exposed, your funds can be taken and cannot be recovered by the Platform. The
        Platform will never ask for your private key or seed phrase.
      </p>

      <H>6. Technical and network risk</H>
      <p>
        Blockchain networks can experience bugs, congestion, or unexpected behavior.
        Network fees, failed transactions, and downtime are possible and are outside the
        Platform&rsquo;s control.
      </p>

      <H>7. Regulatory risk</H>
      <p>
        The legal status of digital assets and referral-based systems varies by
        jurisdiction and may change. You are responsible for complying with the laws that
        apply to you.
      </p>

      <H>8. Your responsibility</H>
      <p>
        By using the Platform you confirm that you understand these risks and that you
        participate entirely at your own risk.
      </p>
    </LegalLayout>
  );
}
