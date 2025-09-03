import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

export default function ShowmanshipSection() {
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
    <section ref={ref} className="min-h-screen flex items-center justify-center bg-white">
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
            Proactive <span className="text-blue-500">Showmanship</span>
          </motion.h2>
          
          <motion.div 
            variants={containerVariants}
            className="space-y-12 max-w-3xl mx-auto"
          >
            <motion.div variants={textVariants} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-black mb-4 leading-tight">
                We don't ask for permission to create.
              </p>
              <p className="text-lg md:text-xl text-gray-600 font-light leading-relaxed">
                Innovation requires courage. While others seek approval, 
                we build solutions. Progress isn't a committee decision.
              </p>
            </motion.div>
            
            <motion.div variants={textVariants} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-black mb-4 leading-tight">
                We ask questions, try things, then <span className="text-blue-500">show</span>.
              </p>
              <p className="text-lg md:text-xl text-gray-600 font-light leading-relaxed">
                Curiosity drives exploration. Experiments generate insights. 
                Results speak louder than theories.
              </p>
            </motion.div>
            
            <motion.div variants={textVariants} className="text-center">
              <p className="text-3xl md:text-4xl font-black text-black mb-4 leading-tight">
                Show, don't tell. Talk less, do more.
              </p>
              <p className="text-lg md:text-xl text-gray-600 font-light leading-relaxed">
                Demos beat presentations. Working code beats wireframes. 
                Actions create believers, not words.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex justify-center pt-8"
          >
            <motion.div
              className="w-64 h-40 bg-gray-100 rounded-2xl shadow-lg relative overflow-hidden border border-gray-200"
              whileHover={{ 
                scale: 1.02,
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)"
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute inset-4 bg-white rounded-xl shadow-inner">
                <div className="absolute inset-6 flex flex-col justify-center items-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="text-3xl mb-3 text-blue-500"
                  >
                    ✨
                  </motion.div>
                  <div className="text-base font-semibold text-black mb-1">
                    LIVE DEMO
                  </div>
                  <div className="text-xs text-gray-500">
                    v2.1.0
                  </div>
                </div>
                
                <motion.div
                  animate={{
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity
                  }}
                  className="absolute top-3 right-3 w-2 h-2 bg-green-500 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
            transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
            className="w-24 h-1 bg-blue-500 mx-auto"
          />
        </motion.div>
      </div>
    </section>
  )
}