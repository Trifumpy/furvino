// filepath: /nextjs-api-app/nextjs-api-app/src/app/page.tsx
import { useEffect, useState } from 'react';
import { Novel } from '@/lib/types'; // Assuming you have a types file for Novel type

export default function HomePage() {
  const [novels, setNovels] = useState<Novel[]>([]);

  useEffect(() => {
    const fetchNovels = async () => {
      const response = await fetch('/api/novels');
      const data = await response.json();
      setNovels(data);
    };

    fetchNovels();
  }, []);

  return (
    <div>
      <h1>Novels</h1>
      <ul>
        {novels.map((novel) => (
          <li key={novel.id}>
            <h2>{novel.title}</h2>
            <p>{novel.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}