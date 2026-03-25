"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

interface Department {
  id: string;
  name: string;
  description: string;
  what_they_do: string;
  who_should_join: string;
  cta_text?: string;
  display_order: number;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDepartments() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        setDepartments((data as Department[]) || []);
      } catch (err) {
        console.error('Error fetching departments:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDepartments();
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 bg-surface">
        <section className="px-8 max-w-7xl mx-auto mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <span className="text-sky font-bold text-sm tracking-[0.2em] uppercase mb-4 inline-block">Serve In Excellence</span>
            <h1 className="font-headline text-5xl md:text-7xl text-midnight mb-8">
              Join A Department
            </h1>
            <p className="text-on-surface-variant text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              The sanctuary requires dedicated hands. Discover where your gifts align with the grand assignment of winning, building, and sending.
            </p>
          </motion.div>
        </section>

        <section className="px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              // Skeleton Loaders
              [1, 2, 3].map((i) => (
                <div key={i} className="p-10 bg-surface-container-low animate-pulse rounded-3xl h-96"></div>
              ))
            ) : departments.map((dept, i) => (
              <motion.div 
                key={dept.id || dept.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group p-10 bg-white rounded-3xl border border-outline-variant/30 hover:border-sky hover:shadow-2xl hover:shadow-sky/5 transition-all flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-headline text-2xl text-midnight mb-4 group-hover:text-sky transition-colors">
                    {dept.name}
                  </h3>
                  <p className="text-on-surface-variant text-sm font-semibold mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky"></span>
                    {dept.description}
                  </p>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-label-small uppercase tracking-widest text-sky font-bold mb-2">What We Do</h4>
                      <p className="text-on-surface-variant text-sm leading-relaxed">{dept.what_they_do}</p>
                    </div>
                    <div>
                      <h4 className="text-label-small uppercase tracking-widest text-sky font-bold mb-2">Who Should Join</h4>
                      <p className="text-on-surface-variant text-sm leading-relaxed">{dept.who_should_join}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-outline-variant/30">
                  <Link href="/connect" className="flex items-center gap-2 text-midnight font-bold text-sm group/btn hover:text-sky transition-colors">
                    <span>{dept.cta_text || "Learn More"}</span>
                    <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
          
          {!loading && departments.length === 0 && (
            <div className="text-center py-20">
               <p className="text-on-surface-variant text-lg">No departments found. Please check back later.</p>
            </div>
          )}
        </section>

        {/* Community in Action */}
        <section className="mt-32 px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-video lg:aspect-square rounded-[3rem] overflow-hidden shadow-2xl group"
            >
              <div className="absolute inset-0 bg-midnight/10 mix-blend-overlay"></div>
              <img 
                src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2070&auto=format&fit=crop" 
                alt="Heartbeat of God Ministry Community - A group of believers gathered in fellowship" 
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/60 via-transparent to-transparent"></div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <span className="text-sky font-bold text-sm tracking-[0.2em] uppercase inline-block">The Heart of Service</span>
              <h2 className="font-headline text-4xl text-midnight leading-tight">Community in Action</h2>
              <p className="text-on-surface-variant text-lg leading-relaxed">
                Beyond tasks and responsibilities, our departments are vibrant communities of believers growing together. We are one body with many parts, all beating with the same passion: the Heartbeat of God.
              </p>
              <div className="flex gap-4">
                <div className="flex -space-x-4 overflow-hidden">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="inline-block h-12 w-12 rounded-full ring-4 ring-white bg-surface-container-high overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?u=${i+10}`} alt="Member avatar" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-sm font-bold text-midnight leading-none">Join 50+ Volunteers</p>
                  <p className="text-xs text-on-surface-variant mt-1">Growing together in service</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Join CTA */}
        <section className="mt-32 px-8 py-24 bg-midnight text-white text-center rounded-[3rem] mx-8 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-sky/10 to-transparent"></div>
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="font-headline text-4xl mb-8">Ready to serve the Kingdom?</h2>
            <p className="text-white/70 text-lg mb-12">
              Every hand counts in the assignment of raising Christ-conscious believers. Join a department today and find your reason to live through service.
            </p>
            <Link href="/connect" className="px-10 py-5 bg-sky text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-xl shadow-sky/20 inline-block">
              General Service Application
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
