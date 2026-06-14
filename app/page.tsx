import SearchForm from "@/components/SearchForm";
import DealFeed from "@/components/DealFeed";
import FilterBar from "@/components/FilterBar";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 xl:max-w-7xl xl:px-8 2xl:max-w-[1600px] 2xl:px-12 2xl:py-12">
      <header className="mb-8 2xl:mb-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl xl:text-3xl">✈</span>
          <h1 className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-3xl font-black text-transparent xl:text-4xl">
            AirScout
          </h1>
        </div>
        <p className="mt-1 max-w-3xl text-slate-400 xl:text-lg">
          Autonomous AI agents scan global inventories, decode routings, and surface the absolute
          lowest-priced way to your destination.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 2xl:gap-12">
        <section className="space-y-6 lg:col-span-2 lg:sticky lg:top-8 lg:self-start">
          <SearchForm />
          <FilterBar />
        </section>
        <section className="lg:col-span-3">
          <DealFeed />
        </section>
      </div>
    </main>
  );
}
