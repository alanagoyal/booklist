import fs from 'fs';
import path from 'path';

export interface BlogPost {
  slug: string;
  title: string;
  content: string;
}

const BLOG_DIRECTORY = path.join(process.cwd(), 'app/insights/content');

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(BLOG_DIRECTORY, `${slug}.md`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract title from the first h2 heading
    const titleMatch = fileContent.match(/^## (.*)/m);
    const title = titleMatch ? titleMatch[1] : slug;
    
    return {
      slug,
      title,
      content: fileContent,
    };
  } catch (error) {
    console.error(`Error loading blog post ${slug}:`, error);
    return null;
  }
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  try {
    const files = fs.readdirSync(BLOG_DIRECTORY);
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    
    const posts = await Promise.all(
      markdownFiles.map(async (file) => {
        const slug = file.replace(/\.md$/, '');
        const post = await getBlogPost(slug);
        return post;
      })
    );
    
    return posts.filter((post): post is BlogPost => post !== null);
  } catch (error) {
    console.error('Error loading blog posts:', error);
    return [];
  }
}
