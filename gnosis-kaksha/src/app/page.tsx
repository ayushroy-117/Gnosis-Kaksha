'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookOpen, Users, Award, Globe, Play, ChevronRight, Star, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Home() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);

  useEffect(() => {
    setTeachers([
      { id: 1, name: 'Ankur Kumar Nath', subject: 'Founder & CEO | Physics', qualification: 'B.Sc in Physics Hons', image: '/teachers/ankur.webp' },
      { id: 2, name: 'Jumki Roy', subject: 'English Teacher cum Accountant', qualification: 'B.A., M.A', image: '/teachers/jumki.png' },
      { id: 3, name: 'Susmita Nath', subject: 'Bengali Teacher', qualification: 'B.A, M.A, B.Ed', image: '/teachers/susmita.png' },
      { id: 4, name: 'Barnali Paul', subject: 'Biology Teacher', qualification: 'M.Sc (Gold), B.Sc (Silver), B.Ed, C.I.E.T', image: '/teachers/barnali.jpg' },
      { id: 5, name: 'Riya Nath', subject: 'History Teacher', qualification: 'B.A', image: '/teachers/riya nath.png' },
      { id: 6, name: 'Joydeep Dey', subject: 'Maths Teacher', qualification: 'B.Sc in Maths Hons, B.Ed', image: '/teachers/joydeep dey.png' },
      { id: 7, name: 'Anal Choudhury', subject: 'English Teacher', qualification: 'B.A, D.I.L.D, A1E1', image: '/teachers/anal.png' },
      { id: 8, name: 'Abu Sahid', subject: 'Economics Teacher', qualification: 'B.A, M.A in Economics, B.Ed', image: '/teachers/abu sahid.png' },
      { id: 9, name: 'Md Ali Hasan', subject: 'History & Political Science Teacher', qualification: 'B.A., M.A in History', image: '/teachers/md ali hasan.png' },
      { id: 10, name: 'Sanjib Paul', subject: 'Maths Teacher', qualification: 'B.Sc', image: '/teachers/sanjib.png' },
    ]);

    setGallery([
      { id: 1, image: '/gallery/gallery_1776019382_a5185fce.png', caption: 'Gallery Image 1' },
      { id: 2, image: '/gallery/gallery_1776019823_d13fdc8a.png', caption: 'Gallery Image 2' },
      { id: 3, image: '/gallery/gallery_1776019930_4c42e5b9.png', caption: 'Gallery Image 3' },
      { id: 4, image: '/gallery/gallery_1776020047_d2448a35.png', caption: 'Gallery Image 4' },
    ]);
  }, []);

  return (
    <div className="bg-white">
      {/* Hero Section - Enhanced with visual depth */}
      <section className="relative overflow-hidden bg-linear-to-br from-[#2E5EAA] via-[#1295D8] to-[#0D7FBD] text-white py-32 px-4">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -ml-48 -mb-48"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="mb-6 inline-block">
                <span className="bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full border border-white/30">
                  🎓 Premium Education Platform
                </span>
              </div>
              <h1 className="text-6xl md:text-7xl font-black mb-8 leading-tight">
                Learn From The <span className="bg-linear-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">Best</span>
              </h1>
              <p className="text-lg text-blue-100 mb-10 leading-relaxed font-medium">
                Transform your learning journey with world-class education from expert instructors. Join thousands of students already achieving their dreams.
              </p>
              <div className="flex gap-4 flex-wrap">
                <Link href="/admission">
                  <Button size="lg" className="bg-linear-to-r from-orange-400 to-red-500 text-white hover:shadow-2xl transform hover:scale-105 transition">
                    Start Admission <ChevronRight className="h-5 w-5" />
                  </Button>
                </Link>
                <button className="flex items-center gap-2 px-8 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition border border-white/40 font-semibold">
                  <Play className="h-5 w-5" />
                  Watch Demo
                </button>
              </div>
            </div>
            <div className="relative">
              {/* Animated card with gradient border */}
              <div className="relative">
                <div className="absolute -inset-1 bg-linear-to-r from-orange-400 to-pink-500 rounded-3xl blur opacity-30"></div>
                <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl aspect-video flex items-center justify-center border border-white/20 overflow-hidden">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/IufL1CDejzg?start=27&autoplay=0"
                    title="Learning Dashboard Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Bold & Vibrant */}
      <section className="py-28 px-4 bg-linear-to-b from-white to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-[#1A2B4A] mb-6">Why Choose Gnosis Kaksha?</h2>
            <p className="text-xl text-[#4A5568] font-medium">Everything you need for success in one platform</p>
            <div className="h-1 w-24 bg-linear-to-r from-[#1295D8] to-orange-400 mx-auto mt-6"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Users,
                title: 'Excellence Teaching',
                description: 'Learn from experienced educators who are passionate about student success.',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: BookOpen,
                title: 'Quality Learning',
                description: 'Access high-quality educational content designed for optimal learning outcomes.',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: Award,
                title: 'Periodical Assessment',
                description: 'Regular evaluations to track and improve your academic progress.',
                color: 'from-orange-500 to-red-500'
              },
              {
                icon: Users,
                title: 'Best Teachers',
                description: 'Learn from industry experts and experienced educators.',
                color: 'from-green-500 to-emerald-500'
              }
            ].map((feature, index) => (
              <div key={index} className="group relative">
                <div className="absolute -inset-1 bg-linear-to-r opacity-0 group-hover:opacity-100 from-blue-500 to-orange-400 rounded-2xl blur transition duration-300"></div>
                <Card className="relative bg-white p-8 h-full hover:shadow-2xl transition duration-300 border-0">
                  <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 bg-linear-to-br ${feature.color} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-[#1A2B4A] text-center">{feature.title}</h3>
                  <p className="text-[#4A5568] leading-relaxed font-medium text-center">{feature.description}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section - Premium Feel */}
      <section className="py-28 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#1295D8] font-bold text-sm uppercase tracking-widest">About Us</span>
              <h2 className="text-5xl font-black text-[#1A2B4A] mb-8 leading-tight">
                Transforming Education Worldwide
              </h2>
              <p className="text-lg text-[#4A5568] mb-6 leading-relaxed font-medium">
                Gnosis Kaksha is committed to providing quality education that transforms lives and empowers learners to achieve their full potential.
              </p>
              <p className="text-lg text-[#4A5568] mb-8 leading-relaxed font-medium">
                With a focus on personalized learning and expert instruction, we help students excel academically and develop critical thinking skills.
              </p>
              <blockquote className="border-l-4 border-gradient-to-b from-[#1295D8] to-orange-400 pl-6 italic text-[#4A5568] text-lg font-semibold">
                "Education is the most powerful tool which you can use to change the world."
              </blockquote>
            </div>
            <div className="relative">
              <div className="absolute -inset-2 bg-linear-to-r from-[#1295D8] to-orange-400 rounded-3xl opacity-20 blur-2xl"></div>
              <div className="relative rounded-3xl aspect-square overflow-hidden shadow-2xl">
                <img 
                  src="/gallery/gallery_1776020143_4325a91a.png" 
                  alt="Building Global Learners" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-8">
                  <p className="text-white font-bold text-xl">Building Global Learners</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section - Enhanced */}
      <section className="py-28 px-4 bg-linear-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-[#1295D8] font-bold text-sm uppercase tracking-widest">Learning Environment</span>
            <h2 className="text-5xl font-black text-[#1A2B4A] mt-4 mb-6">Our Gallery</h2>
            <p className="text-xl text-[#4A5568] font-medium">Check out our learning environment and student activities</p>
            <div className="h-1 w-24 bg-linear-to-r from-[#1295D8] to-orange-400 mx-auto mt-6"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {gallery.map((item) => (
              <div key={item.id} className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-lg">
                <img
                  src={item.image}
                  alt={item.caption}
                  className="w-full aspect-square object-cover group-hover:scale-125 transition duration-500"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent group-hover:from-black/90 transition flex items-end p-6">
                  <p className="text-white font-bold text-lg">{item.caption}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Link href="/gallery">
              <Button variant="outline" size="lg" className="border-2 border-[#1295D8] text-[#1295D8] hover:bg-[#1295D8] hover:text-white">
                View All Gallery <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Teachers Section - Premium Cards */}
      <section className="py-28 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-[#1295D8] font-bold text-sm uppercase tracking-widest">Expert Educators</span>
            <h2 className="text-5xl font-black text-[#1A2B4A] mt-4 mb-6">Our Teachers</h2>
            <p className="text-xl text-[#4A5568] font-medium">Learn from the best educators in the industry</p>
            <div className="h-1 w-24 bg-linear-to-r from-[#1295D8] to-orange-400 mx-auto mt-6"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="group relative">
                <div className="absolute -inset-1 bg-linear-to-r opacity-0 group-hover:opacity-100 from-[#1295D8] to-orange-400 rounded-2xl blur transition"></div>
                <Card className="relative bg-white text-center p-8 hover:shadow-2xl transition border-0 h-full">
                  <div className="mb-6 inline-block relative">
                    <img
                      src={teacher.image}
                      alt={teacher.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-[#CDE6F7] shadow-lg"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-linear-to-r from-[#1295D8] to-orange-400 p-2 rounded-full">
                      <Star className="h-5 w-5 text-white fill-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-[#1A2B4A]">{teacher.name}</h3>
                  <p className="text-sm text-[#4A5568] font-semibold mb-3">{teacher.subject}</p>
                  <p className="bg-linear-to-r from-[#1295D8]/10 to-orange-400/10 text-[#1295D8] text-xs font-semibold rounded px-3 py-1 inline-block border border-[#1295D8]/20">{teacher.qualification}</p>
                </Card>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Button variant="outline" size="lg" className="border-2 border-[#1295D8] text-[#1295D8] hover:bg-[#1295D8] hover:text-white">
              View All Teachers <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section - Vibrant */}
      <section className="relative overflow-hidden bg-linear-to-r from-[#2E5EAA] via-[#1295D8] to-[#0D7FBD] text-white py-32 px-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -ml-48 -mb-48"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
          <h2 className="text-5xl md:text-6xl font-black mb-8 leading-tight">Ready to Start Your Learning Journey?</h2>
          <p className="text-xl text-blue-100 mb-10 font-medium">Join thousands of students who are already achieving their goals with Gnosis Kaksha</p>
          <Link href="/admission">
            <Button size="lg" className="bg-linear-to-r from-orange-400 to-red-500 text-white hover:shadow-2xl transform hover:scale-105 transition">
              Apply Now <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
