"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 bg-surface">
        {/* Hero Section */}
        <section className="px-8 max-w-7xl mx-auto text-center mb-24">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-secondary font-bold text-sm tracking-[0.2em] uppercase mb-4 inline-block"
          >
            Our Identity
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-headline text-5xl md:text-7xl text-primary-container mb-8"
          >
            Heartbeat of God Ministry
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-on-surface-variant text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed italic font-serif"
          >
            "A Reason to Live"
          </motion.p>
        </section>

        {/* Vision & Founder */}
        <section className="px-8 py-24 bg-surface-container-low">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="font-headline text-4xl text-primary-container leading-tight">Our Vision</h2>
              <p className="text-on-surface-variant text-lg leading-relaxed">
                To bring men to the sense of God’s divine presence. We exist to help people encounter Christ, grow spiritually, and influence the world through the power of the Holy Spirit.
              </p>
              <div className="pt-8 border-t border-outline-variant">
                <p className="font-headline text-2xl text-primary-container mb-2">Founder & Lead Pastor</p>
                <p className="text-secondary font-bold text-lg">Pastor Amos Unogwu</p>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl group"
            >
              <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
              <img 
                src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2070&auto=format&fit=crop" 
                alt="Pastor Amos Unogwu - Lead Pastor" 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-10 left-10">
                <p className="text-white font-headline text-3xl">Pst. Amos Unogwu</p>
                <p className="text-white/60 text-sm uppercase tracking-widest font-bold">Leading the Vision</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Mission Model: Win Build Send */}
        <section className="px-8 py-32 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-headline text-4xl text-primary-container mb-4">The Mission Model</h2>
            <div className="text-5xl md:text-6xl font-headline text-secondary-fixed opacity-50 tracking-widest mt-4">
              WIN • BUILD • SEND
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { 
                title: "WIN", 
                desc: "Bringing people to Christ through evangelism, outreach, and the preaching of the Gospel.",
                icon: "volunteer_activism"
              },
              { 
                title: "BUILD", 
                desc: "Nurturing believers through the Word of God, prayer, fellowship, discipleship, and spiritual development.",
                icon: "auto_stories"
              },
              { 
                title: "SEND", 
                desc: "Releasing believers to influence communities and the world through service, leadership, and Kingdom impact.",
                icon: "send_and_archive"
              }
            ].map((step, i) => (
              <motion.div 
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="p-12 bg-white dark:bg-slate-900 rounded-3xl shadow-sm hover:shadow-xl transition-all border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-5xl text-secondary mb-8">{step.icon}</span>
                <h3 className="font-headline text-3xl text-primary-container mb-4">{step.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Core Emphasis */}
        <section className="px-8 py-32 bg-primary text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-secondary-fixed/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <h2 className="font-headline text-4xl md:text-5xl mb-16 text-center">Spiritual Foundation</h2>
            <div className="flex flex-wrap justify-center gap-6">
              {[
                "The Lordship of Jesus Christ", 
                "Transforming Power of the Holy Spirit", 
                "Authority of Scripture", 
                "Prayer", 
                "Discipleship", 
                "Evangelism", 
                "Christian Growth & Maturity"
              ].map((item, i) => (
                <motion.div 
                  key={item}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-lg font-medium"
                >
                  {item}
                </motion.div>
              ))}
            </div>
            <p className="mt-20 text-center text-white/60 max-w-4xl mx-auto text-lg leading-relaxed italic">
              "We believe that the Holy Spirit reveals truth, empowers believers, produces transformation, enables Christian witness, and leads believers into spiritual maturity."
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
