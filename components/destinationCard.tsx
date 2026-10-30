import Image from "next/image";
import Link from "next/link";

export type Destination = {
  slug: string;
  name: string;
  country: string;
  price: number;
  image: string;
};

export default function DestinationCard({ d }: { d: Destination }) {
  return (
    <Link
      href={`/destinations/${d.slug}`}
      className="group overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-56 overflow-hidden">
        <Image
          src={d.image}
          alt={d.name}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold">{d.name}</h3>
        <p className="text-sm text-slate-500">{d.country}</p>
        <p className="mt-3 font-bold text-orange-600">From ${d.price}</p>
      </div>
    </Link>
  );
}
