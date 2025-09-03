import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

export default function UrgencySection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2
      }
    }
  }

  const textVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8 }
    }
  }

  return (
    <section ref={ref} className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-4xl mx-auto px-8 py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="text-center space-y-16"
        >
          <motion.h2 
            variants={textVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[0.9] text-black tracking-[-0.02em]"
          >
            <span className="text-red-500">Urgency</span> in Action
          </motion.h2>
          
          <motion.div 
            variants={containerVariants}
            className="space-y-12 max-w-3xl mx-auto"
          >
            <motion.div variants={textVariants} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-black mb-4 leading-tight">
                I don't wait. I move.
              </p>
              <p className="text-lg md:text-xl text-gray-600 font-light leading-relaxed">
                Momentum is everything. While others deliberate, I execute. 
                The perfect moment is a myth—the right moment is now.
              </p>
            </motion.div>
            
            <motion.div variants={textVariants} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-black mb-4 leading-tight">
                If it takes less than <span className="text-red-500">5 minutes</span>, I do it now.
              </p>
              <p className="text-lg md:text-xl text-gray-600 font-light leading-relaxed">
                Quick decisions compound into massive advantages. 
                Small actions, taken immediately, create unstoppable momentum.
              </p>
            </motion.div>
            
            <motion.div variants={textVariants} className="text-center">
              <p className="text-3xl md:text-4xl font-black text-black mb-4 leading-tight">
                Work like it matters.
              </p>
              <p className="text-lg md:text-xl text-gray-600 font-light leading-relaxed">
                Because it does. Every task is an opportunity to demonstrate excellence. 
                Mediocrity is a choice—I choose intensity.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
            transition={{ duration: 1, delay: 1, ease: "easeOut" }}
            className="w-24 h-1 bg-red-500 mx-auto"
          />
        </motion.div>
      </div>
    </section>
  )
}