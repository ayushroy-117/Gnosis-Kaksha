'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { X } from 'lucide-react';

export default function Gallery() {
  const [gallery, setGallery] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  useEffect(() => {
    // Gallery images from public/gallery folder
    setGallery([
      { id: 1, image: '/gallery/gallery_1776019382_a5185fce.png', caption: 'Gallery Image 1' },
      { id: 2, image: '/gallery/gallery_1776019823_d13fdc8a.png', caption: 'Gallery Image 2' },
      { id: 3, image: '/gallery/gallery_1776019930_4c42e5b9.png', caption: 'Gallery Image 3' },
      { id: 4, image: '/gallery/gallery_1776020047_d2448a35.png', caption: 'Gallery Image 4' },
      { id: 5, image: '/gallery/gallery_1776020143_4325a91a.png', caption: 'Gallery Image 5' },
      { id: 6, image: '/gallery/gallery_1776020213_0a9e1d13.png', caption: 'Gallery Image 6' },
      { id: 7, image: '/gallery/gallery_1776020277_ac993f67.png', caption: 'Gallery Image 7' },
      { id: 8, image: '/gallery/gallery_1776020610_c718f9e7.png', caption: 'Gallery Image 8' },
      { id: 9, image: '/gallery/gallery_1776115167_c8706ab5.jpg', caption: 'Gallery Image 9' },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A2B4A] mb-4">Gallery</h1>
          <p className="text-xl text-[#4A5568]">Explore our learning environment and student activities</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {gallery.map((item) => (
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
            <p className="text-[#4A5568]">Learn about our educational activities and student engagement programs.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
