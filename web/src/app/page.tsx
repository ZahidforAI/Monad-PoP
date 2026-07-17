import Link from "next/link";
import { ArrowRight, Lock, CheckCircle, ShieldAlert, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="w-full flex-1 flex flex-col items-center bg-background text-foreground transition-colors duration-300">
      
      {/* Hero Section */}
      <section className="w-full max-w-7xl px-6 md:px-12 py-16 md:py-28 flex flex-col lg:flex-row items-center gap-16 relative border-x border-outline-variant">
        
        {/* Registration Marks for Hero Section */}
        <div className="reg-mark reg-tl"></div>
        <div className="reg-mark reg-tr"></div>
        <div className="reg-mark reg-bl lg:hidden"></div>
        <div className="reg-mark reg-br lg:hidden"></div>

        <div className="flex-1 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-semibold text-primary tracking-wider uppercase font-mono">
            <Sparkles className="w-3 h-3 text-accent-cyan" />
            Decoupled Privacy Protocol
          </div>
          
          <h1 className="font-display text-4xl sm:text-6xl font-bold leading-tight tracking-tight">
            Receipts you <br/>
            <span className="italic text-primary font-normal">cannot lose.</span>
          </h1>
          
          <p className="text-lg text-foreground/70 max-w-lg leading-relaxed">
            Secure, tamper-evident purchase credentials on Monad. Transitioning from cold blockchain hashes to tactile, trustworthy digital documents.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              href="/explore"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-semibold font-mono text-xs uppercase tracking-widest rounded-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform"
            >
              Explore Marketplace
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            <Link
              href="/merchant"
              className="flex items-center justify-center gap-2 border border-outline-variant px-8 py-4 font-semibold font-mono text-xs uppercase tracking-widest rounded-lg hover:bg-primary-container/20 transition-colors"
            >
              Merchant Portal
            </Link>
          </div>
        </div>

        {/* Receipt Specimen Visual Card */}
        <div className="flex-1 w-full max-w-md relative select-none">
          <div className="bg-card border border-outline-variant p-8 rounded-lg shadow-sm relative overflow-hidden group">
            
            {/* Serrated Top Edge Detail */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-background border-b border-dashed border-outline-variant"></div>
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="font-mono text-[9px] text-foreground/50 tracking-wider uppercase mb-1">MERCHANT</p>
                <h3 className="font-display text-2xl font-bold">Nordic Sound</h3>
              </div>
              <div className="w-10 h-10 flex items-center justify-center border border-primary text-primary rounded-full">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            
            <div className="border-y border-outline-variant border-dashed py-6 space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="font-mono text-xs text-foreground/50 uppercase">PRODUCT</span>
                <span className="font-mono font-medium text-right text-foreground">Aura Headphones v.2</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-mono text-xs text-foreground/50 uppercase">DATE</span>
                <span className="font-mono font-medium text-right text-foreground">2026-10-12 14:32</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-mono text-xs text-foreground/50 uppercase">WARRANTY</span>
                <span className="font-mono font-medium text-right text-foreground">24 MONTHS (ACTIVE)</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="bg-primary/10 text-primary flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-xs font-semibold uppercase">
                <Lock className="w-3.5 h-3.5" />
                Verified on Monad
              </div>
              <div className="font-mono text-[10px] text-foreground/40 tracking-wider break-all px-4">
                0x71C7656EC7AB88B098DEF...C5A84194410192B067
              </div>
            </div>
            
            {/* Decorative Receipt Bottom */}
            <div className="mt-8 pt-4 border-t border-dashed border-outline-variant flex justify-between items-center opacity-30">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-foreground rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-foreground rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-foreground rounded-full"></div>
              </div>
              <span className="font-mono text-[9px]">#836EF9-LEDGER</span>
            </div>
          </div>
          
          {/* Stacked sheets visual effect */}
          <div className="absolute -bottom-2 -right-2 w-full h-full border border-outline-variant bg-card rounded-lg -z-10 opacity-70"></div>
          <div className="absolute -bottom-4 -right-4 w-full h-full border border-outline-variant/50 bg-card rounded-lg -z-20 opacity-40"></div>
        </div>
      </section>

      {/* Process Flow Section */}
      <section className="w-full bg-primary-container/20 border-y border-outline-variant py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-mono text-xs font-bold text-primary tracking-widest uppercase">Ecosystem Workflow</span>
            <h2 className="font-display text-3xl font-bold mt-2">The journey of a Monad Receipt</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 border border-outline-variant bg-card rounded-lg overflow-hidden divide-y md:divide-y-0 md:divide-x divide-outline-variant">
            
            {/* Step 1 */}
            <div className="p-10 hover:bg-primary-container/5 transition-colors group">
              <div className="mb-6 w-10 h-10 flex items-center justify-center bg-primary text-white rounded-lg font-mono font-bold text-sm">01</div>
              <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground mb-3">ISSUE</h4>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Merchant broadcasts a secure minting event upon purchase confirmation. The receipt metadata is committed to off-chain storage.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="p-10 hover:bg-primary-container/5 transition-colors group">
              <div className="mb-6 w-10 h-10 flex items-center justify-center bg-primary text-white rounded-lg font-mono font-bold text-sm">02</div>
              <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground mb-3">KEEP</h4>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Credentials land in your decentralized wallet. Unlike paper or emails, they cannot be deleted, altered, or lost in your inbox.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="p-10 hover:bg-primary-container/5 transition-colors group">
              <div className="mb-6 w-10 h-10 flex items-center justify-center bg-primary text-white rounded-lg font-mono font-bold text-sm">03</div>
              <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground mb-3">VERIFY</h4>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Instant secondary market verification or warranty claims. Prove ownership without revealing sensitive personal details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Comparison Table Section */}
      <section className="w-full max-w-7xl px-6 md:px-12 py-24 border-x border-outline-variant">
        <div className="flex flex-col lg:flex-row gap-16 items-start">
          
          <div className="flex-1 lg:sticky lg:top-24 space-y-6">
            <h2 className="font-display text-3xl font-bold leading-tight">Selective Transparency</h2>
            <p className="text-base text-foreground/70 leading-relaxed">
              The ledger is public, but your lifestyle isn't. We use Monad's high-throughput architecture to decouple transaction metadata from product specifics.
            </p>
            <div className="p-5 bg-primary-container/30 border-l-4 border-primary rounded-r-lg italic text-xs text-foreground/80 leading-relaxed">
              &ldquo;Ownership is absolute. Identity is optional.&rdquo;
            </div>
          </div>
          
          <div className="flex-1 w-full bg-card border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-container/40 border-b border-outline-variant">
                  <th className="p-4 font-mono text-xs font-bold uppercase tracking-wider text-foreground/60">DATA FIELD</th>
                  <th className="p-4 font-mono text-xs font-bold uppercase tracking-wider text-primary">PRIVATE (USER)</th>
                  <th className="p-4 font-mono text-xs font-bold uppercase tracking-wider text-foreground/60">PUBLIC (LEDGER)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm">
                <tr>
                  <td className="p-4 font-mono text-xs font-medium text-foreground">Asset ID</td>
                  <td className="p-4 font-sans text-foreground/80">Aura Headphones v.2</td>
                  <td className="p-4 font-mono text-[11px] text-foreground/40">0x71C...4101</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-xs font-medium text-foreground">Value</td>
                  <td className="p-4 font-sans text-foreground/80">$349.00 USD</td>
                  <td className="p-4 font-mono text-[11px] text-foreground/40">HASHED_BLOB_82</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-xs font-medium text-foreground">Merchant</td>
                  <td className="p-4 font-sans text-foreground/80">Nordic Sound Stockholm</td>
                  <td className="p-4 font-mono text-[11px] text-foreground/40">MONAD_PTR_091</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-xs font-medium text-foreground">Timestamp</td>
                  <td className="p-4 font-sans text-foreground/80">Oct 12, 14:32:01</td>
                  <td className="p-4 font-mono text-[11px] text-foreground/40">1728743521</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust Notice Block */}
      <section className="w-full max-w-7xl px-6 md:px-12 pb-24 border-x border-outline-variant">
        <div className="bg-primary-container/30 border border-primary/20 p-8 rounded-2xl max-w-3xl mx-auto flex flex-col md:flex-row gap-6 items-start relative overflow-hidden">
          
          {/* Registration Marks for Notice Box */}
          <div className="reg-mark border-primary/20 reg-tl"></div>
          <div className="reg-mark border-primary/20 reg-tr"></div>
          
          <div className="p-3 bg-primary/10 rounded-xl text-primary mt-1">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h4 className="text-primary font-mono text-xs font-bold uppercase tracking-wider">
              Immutable Trust Notice
            </h4>
            <p className="text-xs text-foreground/70 leading-relaxed">
              Monad PoP proves that an authorized merchant issued a purchase credential to a wallet address at a specific time. It does <strong>not</strong> independently verify current physical possession of the physical object or product condition. It represents an immutable receipt record of sale.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
