import Hero from "@/components/hero";
import DestinationCard, { Destination } from "@/components/destinationCard";

const destinations: Destination[] = [
  { slug: "bali", name: "Bali", country: "Indonesia", price: 799, image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800" },
  { slug: "paris", name: "Paris", country: "France", price: 999, image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800" },
  { slug: "agra", name: "Agra", country: "India", price: 299, image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800" },
];

export default function Home() {
  return (
    <>
      <Hero />
      {/* this sheet slides up over the fixed 3D scene */}
      <section
        id="destinations"
        className="relative z-10 -mt-10 rounded-t-[2.5rem] bg-white pb-24 pt-20 shadow-[0_-30px_60px_rgba(0,0,0,0.25)]"
      >
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Handpicked</p>
          <h2 className="mt-2 mb-10 text-3xl font-bold sm:text-4xl">Popular Destinations</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {destinations.map((d) => (
              <DestinationCard key={d.slug} d={d} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
