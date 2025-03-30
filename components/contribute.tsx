'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface BookRecommendation {
  title: string
  author: string
}

export default function Contribute() {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    books: [{ title: '', author: '' }] as BookRecommendation[]
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
      setFormData({ name: '', url: '', books: [{ title: '', author: '' }] })
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
      books: [...prev.books, { title: '', author: '' }]
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
            className="px-4 py-2 bg-background hover:bg-accent/50 border border-border rounded transition-colors duration-200"
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
            <label htmlFor="name" className="block text-text">
              Your Name
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
            <label htmlFor="url" className="block text-text">
              Your URL (optional)
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
              <label className="block text-text">Book Recommendations</label>
              <button
                type="button"
                onClick={addBook}
                className="flex items-center space-x-1 px-2 py-1 text-sm bg-background hover:bg-accent/50 border border-border rounded transition-colors duration-200"
              >
                <Plus className="h-4 w-4" />
                <span>Add Book</span>
              </button>
            </div>
            
            {formData.books.map((book, index) => (
              <div key={index} className="space-y-2 p-4 border border-border rounded">
                <div className="flex justify-between">
                  <span className="text-sm text-text/70">Book {index + 1}</span>
                  {formData.books.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBook(index)}
                      className="text-text/70 hover:text-text transition-colors duration-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Book Title"
                    required
                    value={book.title}
                    onChange={(e) => handleBookChange(index, 'title', e.target.value)}
                    className="w-full bg-background text-text border-border border p-2 font-base selection:bg-main selection:text-mtext"
                  />
                  <input
                    type="text"
                    placeholder="Author"
                    required
                    value={book.author}
                    onChange={(e) => handleBookChange(index, 'author', e.target.value)}
                    className="w-full bg-background text-text border-border border p-2 font-base selection:bg-main selection:text-mtext"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 bg-background hover:bg-accent/50 border border-border rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  )
}