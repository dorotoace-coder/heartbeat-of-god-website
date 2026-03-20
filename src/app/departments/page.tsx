"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
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
        setDepartments(data || []);
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
            <span className="text-secondary font-bold text-sm tracking-[0.2em] uppercase mb-4 inline-block">Serve In Excellence</span>
            <h1 className="font-headline text-5xl md:text-7xl text-primary-container mb-8">
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
                className="group p-10 bg-white dark:bg-slate-900 rounded-3xl border border-outline-variant/30 hover:border-secondary hover:shadow-2xl hover:shadow-secondary/5 transition-all flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-headline text-2xl text-primary-container mb-4 group-hover:text-secondary transition-colors">
                    {dept.name}
                  </h3>
                  <p className="text-on-surface-variant text-sm font-semibold mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    {dept.description}
                  </p>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-label-small uppercase tracking-widest text-secondary font-bold mb-2">What We Do</h4>
                      <p className="text-on-surface-variant text-sm leading-relaxed">{dept.what_they_do}</p>
                    </div>
                    <div>
                      <h4 className="text-label-small uppercase tracking-widest text-secondary font-bold mb-2">Who Should Join</h4>
                      <p className="text-on-surface-variant text-sm leading-relaxed">{dept.who_should_join}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-outline-variant/30">
                  <Link href="/connect" className="flex items-center gap-2 text-primary-container font-bold text-sm group/btn hover:text-secondary transition-colors">
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

        {/* Join CTA */}
        <section className="mt-32 px-8 py-24 bg-primary text-white text-center rounded-[3rem] mx-8 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-fixed/10 to-transparent"></div>
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="font-headline text-4xl mb-8">Ready to serve the Kingdom?</h2>
            <p className="text-white/70 text-lg mb-12">
              Every hand counts in the assignment of raising Christ-conscious believers. Join a department today and find your reason to live through service.
            </p>
            <Link href="/connect" className="px-10 py-5 bg-secondary-fixed text-on-secondary-fixed rounded-2xl font-bold hover:scale-105 transition-all shadow-xl shadow-secondary-fixed/20 inline-block">
              General Service Application
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
