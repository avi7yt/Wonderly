import Hero from "@/components/hero";
import DestinationCard, { Destination } from "@/components/destinationCard";

const destinations: Destination[] = [
  {
    slug: "bali",
    name: "Bali",
    country: "Indonesia",
    price: 799,
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800",
  },
  {
    slug: "paris",
    name: "Paris",
    country: "France",
    price: 999,
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800",
  },
  {
    slug: "agra",
    name: "Agra",
    country: "India",
    price: 299,
    image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800",
  },
];

export default function Home() {
  return (
    <>
      <Hero />
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-3xl font-bold">Popular Destinations</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {destinations.map((d) => (
            <DestinationCard key={d.slug} d={d} />
          ))}
        </div>
      </section>
    </>
  );
}
