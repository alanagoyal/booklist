import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="h-dvh w-full flex flex-col items-center justify-center bg-background text-text px-4">
      <h1 className="text-4xl font-base mb-4">404</h1>
      <p className="text-text/70 text-center mb-6">This page seems to have wandered off our reading list.</p>
      <Link 
        href="/" 
        className="px-4 py-2 border border-border transition-colors duration-200 md:hover:bg-accent/50"
      >
        Return Home
      </Link>
    </div>
  )
}
