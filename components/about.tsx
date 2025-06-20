import React from "react";

const About = () => {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl leading-none font-bold mt-8 mb-4">About</h1>
      <div className="prose max-w-none">
        <p>
          Booklist is a curated collection of{" "}
          <strong>the most frequently recommended books on the internet</strong>
          , meticulously compiled from trusted sources across a diverse range of
          fields. Great books have the power to influence, inspire, and shape
          ideas, but it&apos;s easy to get trapped in the echo chamber of our
          own fields. Booklist aims to connect readers with recommendations from
          some of the world&apos;s most insightful and influential thinkers
          across a wide range of disciplines. Whether you&apos;re exploring
          economics with prominent entrepreneurs, philosophy with leading
          academics, or creative insights from celebrated artists, Booklist
          brings together a rich tapestry of perspectives to help you discover
          your next impactful read.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">Sources</h3>
        <p>
          The internet has no shortage of book recommendations, yet scattered
          across countless websites, personal blogs, social media, and academic
          sources, they can be hard to find. To create the ultimate reading
          resource, we&apos;ve systematically scoured and aggregated
          recommendations from some of the web&apos;s most authoritative and
          popular platforms, including:
        </p>
        <ul className="my-4 pl-6 space-y-1 list-disc">
          <li className="my-1">
            <a
              href="https://www.blinkist.com/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Blinkist
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://bookauthority.org/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              BookAuthority
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://www.bookmarked.club/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bookmarked
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://bookschatter.com/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              BooksChatter
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://review.firstround.com/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              First Round Review
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://fivebooks.com/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Five Books
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://www.goodbooks.io/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Good Books
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://www.goodreads.com/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Goodreads
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://news.ycombinator.com/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Hacker News
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://news.harvard.edu/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Harvard University
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://hub.jhu.edu/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Johns Hopkins University
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://www.productbooks.co/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              ProductBooks
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://radicalreads.com/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Radical Reads
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://ultimatebooklist.com/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ultimate Book List
            </a>
          </li>
          <li className="my-1">
            <a
              href="https://www.venturebookclub.com/"
              className="text-text hover:underline hover:text-text/80 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Venture Book Club
            </a>
          </li>
        </ul>
        <p>
          Beyond these prominent sources, we also gather insights directly from
          personal websites, social platforms such as X (formerly Twitter), and
          curated recommendations shared through word of mouth, ensuring our
          dataset captures diverse and authentic voices.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">Goal</h3>
        <p>
          The goal of this project is not only to help you discover what to read
          next but also to uncover insights hidden within the overlap of book
          recommendations. The books someone chooses to recommend say a lot
          about who they are, their interests, and their values. By analyzing
          shared recommendations, it&apos;s possible to identify similarities
          between different types of people, revealing unexpected connections or
          highlighting intriguing differences even within similar groups. The
          product is designed to be a tool for discovery and exploration,
          encouraging you to pull on threads of shared connections or go down
          rabbit holes to chase your curiosities. Through this unique lens,
          Booklist offers a deeper understanding of how literature shapes—and is
          shaped by—the diverse perspectives around us.
        </p>
      </div>
    </div>
  );
};

export default About;
