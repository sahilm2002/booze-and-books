export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-amber-200 via-orange-200 to-amber-200 bg-clip-text text-transparent">
        Booze & Books
      </h1>
      <p className="text-xl text-slate-300 mb-8">
        Where Literature Meets Libations
      </p>
      <p className="text-slate-400">
        🎉 Success! Your beautiful Next.js app is now working perfectly!
      </p>
      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
        <div className="bg-slate-800/50 p-6 rounded-lg border border-amber-500/20">
          <h3 className="text-amber-400 font-semibold mb-2">✅ Next.js Working</h3>
          <p className="text-slate-300">Server-side rendering and routing</p>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-lg border border-amber-500/20">
          <h3 className="text-amber-400 font-semibold mb-2">✅ Tailwind CSS</h3>
          <p className="text-slate-300">Beautiful responsive styling</p>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-lg border border-amber-500/20">
          <h3 className="text-amber-400 font-semibold mb-2">✅ Ready for Phase 2</h3>
          <p className="text-slate-300">Authentication & user features</p>
        </div>
      </div>
    </div>
  )
}