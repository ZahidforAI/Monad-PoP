"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Search, Tag, ShieldCheck, ShoppingBag, Eye, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatEther } from "viem";

interface Passport {
  productName: string;
  brand: string;
  model: string;
  imageUrl: string | null;
  description: string;
}

interface Listing {
  id: string;
  chainListingId: number;
  passportId: number;
  sellerAddress: string;
  price: string; // in wei
  status: string;
  createdAt: string;
  passport: Passport;
}

export default function ExploreMarketplacePage() {
  const { isConnected, sessionAddress } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchListings = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/listings?status=Active");
      if (!res.ok) throw new Error("Failed to load listings");
      const data = await res.json();
      setListings(data.listings || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to retrieve active marketplace listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const brands = ["ALL", ...Array.from(new Set(listings.map((l) => l.passport?.brand).filter(Boolean)))];

  const filteredListings = listings.filter((l) => {
    const matchesSearch =
      l.passport?.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.passport?.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.passport?.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.sellerAddress.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBrand = selectedBrand === "ALL" || l.passport?.brand === selectedBrand;

    return matchesSearch && matchesBrand;
  });

  return (
    <div className="w-full flex-1 bg-background py-12 px-6 max-w-7xl mx-auto flex flex-col gap-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant pb-6">
        <div className="relative inline-block">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="px-6 py-2">
            <h1 className="font-display text-4xl font-bold mb-1">Escrow Marketplace</h1>
            <p className="font-mono text-xs text-foreground/50 tracking-wider">SECURE_PRIVACY_MARKET_V1.0</p>
          </div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>
        </div>

        <button
          onClick={fetchListings}
          disabled={loading}
          className="px-4 py-2 border border-outline-variant hover:bg-primary-container/20 text-xs font-mono font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-monad-purple/10 to-accent-cyan/10 border border-outline-variant rounded-xl p-6 relative overflow-hidden shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <span className="font-mono text-[9px] text-primary font-bold uppercase tracking-widest block">TRUSTLESS ESCROW PROTOCOL</span>
          <h2 className="font-display text-xl font-bold">Privacy-Preserving Physical Trades</h2>
          <p className="text-xs text-foreground/60 leading-relaxed font-sans">
            List and purchase verified physical goods securely on Monad. Funds are held in the escrow contract and only released to the seller once the buyer confirms delivery. Private details (serial numbers, SKUs, references) remain encrypted.
          </p>
        </div>
        <Link
          href="/sell"
          className="px-6 py-3 bg-primary text-white text-xs font-mono font-semibold uppercase tracking-wider rounded-lg hover:opacity-90 transition shadow-lg shrink-0 flex items-center gap-2 text-center"
        >
          <Tag className="w-4 h-4" /> List Your Passport
        </Link>
      </div>

      {/* Controls */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center w-full">
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              type="text"
              placeholder="SEARCH ACTIVE LISTINGS BY BRAND, PRODUCT NAME..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border-b border-outline-variant focus:border-primary focus:ring-0 font-mono text-sm pl-12 pr-4 py-3.5 uppercase transition-all outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full lg:w-auto overflow-x-auto">
            {brands.map((brand) => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`font-mono text-[10px] px-4 py-2.5 border font-bold tracking-widest rounded transition-all shrink-0 uppercase ${
                  selectedBrand === brand
                    ? "bg-primary text-white border-primary"
                    : "bg-card border-outline-variant text-foreground/60 hover:text-foreground hover:bg-primary-container/10"
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="p-4 bg-accent-rose/10 border border-accent-rose/30 rounded-lg text-accent-rose text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* Grid of Listings */}
      {loading ? (
        <div className="text-center py-24 bg-card rounded-lg border border-outline-variant">
          <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">RETRIEVING_ACTIVE_OFFERS...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-lg border border-outline-variant flex flex-col items-center justify-center">
          <ShoppingBag className="w-12 h-12 text-foreground/20 mb-4" />
          <h3 className="text-base font-bold text-foreground mb-1">No Active Listings</h3>
          <p className="text-foreground/50 text-xs max-w-xs leading-relaxed">
            There are no active physical products listed for sale in the marketplace currently.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredListings.map((l) => (
            <div
              key={l.id}
              className="bg-card border border-outline-variant rounded-xl overflow-hidden hover:shadow-2xl hover:border-primary/45 transition-all duration-300 flex flex-col group relative shadow-md"
            >
              {/* Image Header */}
              <div className="h-56 w-full bg-primary-container/5 relative border-b border-outline-variant overflow-hidden">
                {l.passport?.imageUrl ? (
                  <img
                    src={l.passport.imageUrl}
                    alt={l.passport.productName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-foreground/15">
                    <ShoppingBag className="w-16 h-16" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1 bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/30 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED PASSPORT
                  </span>
                </div>
                <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-md border border-outline-variant/60 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-foreground">
                  {formatEther(BigInt(l.price))} MON
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-primary tracking-widest uppercase">
                    {l.passport?.brand}
                  </span>
                  <h3 className="font-display font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                    {l.passport?.productName}
                  </h3>
                  <p className="text-xs text-foreground/60 font-mono">Model: {l.passport?.model}</p>
                  {l.passport?.description && (
                    <p className="text-xs text-foreground/50 line-clamp-2 mt-1 leading-relaxed">
                      {l.passport.description}
                    </p>
                  )}
                </div>

                <div className="border-t border-outline-variant/30 pt-4 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-foreground/45 block uppercase">Seller Wallet</span>
                    <span className="font-semibold text-foreground/80">{`${l.sellerAddress.slice(0, 6)}...${l.sellerAddress.slice(-4)}`}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-foreground/45 block uppercase text-right">Listing ID</span>
                    <span className="font-bold text-foreground block text-right">#L-{l.chainListingId}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/explore/${l.chainListingId}`}
                    className="w-full py-2.5 bg-primary/10 border border-primary/20 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decorative perforation footer */}
      <div className="mt-6 flex items-center gap-4 opacity-50 select-none">
        <div className="perforated-line"></div>
        <span className="font-mono text-[9px] whitespace-nowrap text-foreground/40 uppercase tracking-widest font-bold">End of Active Market Offers</span>
        <div className="perforated-line"></div>
      </div>
    </div>
  );
}
