'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { X } from 'lucide-react';

export default function Gallery() {
  const [gallery, setGallery] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTag, setActiveTag] = useState<string>('All');

  useEffect(() => {
    fetch('/api/gallery')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch gallery');
        return res.json();
      })
      .then((data) => {
        const mapped = (data.images ?? []).map((item: any) => ({
          id: item.id,
          image: item.image_url,
          caption: item.title,
          subtitle: item.caption,
          event_tag: item.event_tag ?? null,
        }));
        setGallery(mapped);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Derive unique event tags for filter tabs
  const allTags = ['All', ...Array.from(new Set(gallery.map((i) => i.event_tag).filter(Boolean))) as string[]];

  const filteredGallery =
    activeTag === 'All' ? gallery : gallery.filter((i) => i.event_tag === activeTag);

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A2B4A] mb-4">Gallery</h1>
          <p className="text-xl text-[#4A5568]">Explore our learning environment and student activities</p>
        </div>

        {/* Event tag filter tabs */}
        {!loading && !error && allTags.length > 1 && (
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-5 py-2 rounded-full text-sm font-semibold border-2 transition ${
                  activeTag === tag
                    ? 'bg-[#1295D8] border-[#1295D8] text-white'
                    : 'bg-white border-[#1295D8] text-[#1295D8] hover:bg-[#1295D8]/10'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg overflow-hidden aspect-square bg-gray-200 shadow-sm" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-[#4A5568] text-lg font-medium">Gallery content unavailable. Please try again later.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredGallery.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedImage(item)}
                className="relative rounded-lg overflow-hidden group cursor-pointer bg-white border border-gray-200 shadow-sm hover:shadow-md"
              >
                <img
                  src={item.image}
                  alt={item.caption}
                  className="w-full aspect-square object-cover group-hover:scale-110 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <p className="text-white font-semibold">
                    {item.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Modal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        size="xl"
      >
        {selectedImage && (
          <div>
            <img
              src={selectedImage.image}
              alt={selectedImage.caption}
              className="w-full rounded-lg mb-4"
            />
            <h3 className="text-2xl font-bold mb-2 text-[#1A2B4A]">{selectedImage.caption}</h3>
            <p className="text-[#4A5568]">
              {selectedImage.subtitle || 'Learn about our educational activities and student engagement programs.'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
