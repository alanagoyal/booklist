'use client'

import { useState } from 'react'

export default function Contribute() {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    title: '',
    author: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Handle form submission
    console.log(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (

      
      <div className="p-6 overflow-auto h-[calc(100vh-4rem)]">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
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
              Your URL
            </label>
            <input
              type="url"
              id="url"
              name="url"
              required
              value={formData.url}
              onChange={handleChange}
              className="w-full bg-background text-text border-border border p-2 font-base selection:bg-main selection:text-mtext"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="title" className="block text-text">
              Book Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full bg-background text-text border-border border p-2 font-base selection:bg-main selection:text-mtext"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="author" className="block text-text">
              Book Author
            </label>
            <input
              type="text"
              id="author"
              name="author"
              required
              value={formData.author}
              onChange={handleChange}
              className="w-full bg-background text-text border-border border p-2 font-base selection:bg-main selection:text-mtext"
            />
          </div>

          <button
            type="submit"
            className="w-full p-2 bg-background border border-border text-text transition-colors duration-200 md:hover:bg-accent/50 font-base"
          >
            Submit Recommendation
          </button>
        </form>
      </div>
  )
}