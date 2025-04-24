'use client'

import { useState } from 'react'
import { Plus, X, ExternalLink, Wand2 } from 'lucide-react'

interface BookRecommendation {
  title: string
  author: string
  amazonUrl?: string
}

export default function Contribute() {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    books: [{ title: '', author: '', amazonUrl: '' }] as BookRecommendation[]
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      const response = await fetch('/api/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) throw new Error('Submission failed')
      
      setSubmitted(true)
      setFormData({ name: '', url: '', books: [{ title: '', author: '', amazonUrl: '' }] })
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleBookChange = (index: number, field: keyof BookRecommendation, value: string) => {
    setFormData(prev => ({
      ...prev,
      books: prev.books.map((book, i) => 
        i === index ? { ...book, [field]: value } : book
      )
    }))
  }

  const addBook = () => {
    setFormData(prev => ({
      ...prev,
      books: [...prev.books, { title: '', author: '', amazonUrl: '' }]
    }))
  }

  const removeBook = (index: number) => {
    if (formData.books.length <= 1) return
    setFormData(prev => ({
      ...prev,
      books: prev.books.filter((_, i) => i !== index)
    }))
  }

  if (submitted) {
    return (
      <div className="h-full p-4 bg-background text-text overflow-y-auto">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-semibold">Thank you for your contribution!</h2>
          <p>Your submission will be reviewed and added to the database once approved.</p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-4 py-2 bg-background hover:bg-accent/50 border border-border transition-colors duration-200"
          >
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-4 bg-background text-text overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-text font-bold">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-background text-text border-border border p-2 font-base selection:bg-main selection:text-mtext"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="url" className="block text-text font-bold">
              URL
            </label>
            <input
              type="url"
              id="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              className="w-full bg-background text-text border-border border p-2 font-base selection:bg-main selection:text-mtext"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-text font-bold">Recommendations</label>
              <button
                type="button"
                onClick={addBook}
                className="flex items-center space-x-1 px-2 py-1 text-sm bg-background hover:bg-accent/50 border border-border transition-colors duration-200"
              >
                <Plus className="h-4 w-4" />
                <span>Add Book</span>
              </button>
            </div>
            
            {formData.books.map((book, index) => (
              <BookInput
                key={index}
                book={book}
                index={index}
                canRemove={formData.books.length > 1}
                onRemove={removeBook}
                onChange={handleBookChange}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 bg-background hover:bg-accent/50 border border-border transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  )
}

interface BookInputProps {
  book: BookRecommendation
  index: number
  canRemove: boolean
  onRemove: (index: number) => void
  onChange: (index: number, field: keyof BookRecommendation, value: string) => void
}

function BookInput({ book, index, canRemove, onRemove, onChange }: BookInputProps) {
  const [loading, setLoading] = useState(false)

  const generateAmazonUrl = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/amazon-url?title=${encodeURIComponent(book.title)}${book.author ? `&author=${encodeURIComponent(book.author)}` : ''}`
      )
      if (response.ok) {
        const data = await response.json()
        onChange(index, 'amazonUrl', data.amazonUrl)
      }
    } catch (error) {
      console.error('Error fetching Amazon URL:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2 p-4 border border-border">
      <div className="flex justify-between">
        <span className="text-sm text-text/70">Book {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-text/70 hover:text-text transition-colors duration-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Title"
          required
          value={book.title}
          onChange={(e) => onChange(index, 'title', e.target.value)}
          className="w-full bg-background text-text border-border border p-2 font-base selection:bg-main selection:text-mtext rounded-none"
        />
        <input
          type="text"
          placeholder="Author"
          required
          value={book.author}
          onChange={(e) => onChange(index, 'author', e.target.value)}
          className="w-full bg-background text-text border-border border p-2 font-base selection:bg-main selection:text-mtext rounded-none"
        />
        
        <div className="relative">
          <input
            type="url"
            placeholder="Amazon URL"
            value={loading ? 'Generating link...' : book.amazonUrl || ''}
            onChange={(e) => onChange(index, 'amazonUrl', e.target.value)}
            className={`w-full bg-background text-text border-border border p-2 ${book.amazonUrl ? 'pr-16' : 'pr-2'} font-base selection:bg-main selection:text-mtext truncate ${loading ? 'text-text/70' : ''} rounded-none`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            {!loading && (
              <>
                {!book.amazonUrl && book.title && book.author ? (
                  <button
                    type="button"
                    onClick={generateAmazonUrl}
                    className="text-text/70 hover:text-text transition-colors duration-200 flex items-center space-x-1"
                  >
                    <Wand2 className="h-3 w-3" />
                    <span className="text-sm">Generate</span>
                  </button>
                ) : book.amazonUrl ? (
                  <a
                    href={book.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text/70 hover:text-text transition-all duration-200 flex items-center space-x-1"
                  >
                    <span className="text-sm">View</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}