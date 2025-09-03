import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'

export default function EnergyAISection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const [currentQuote, setCurrentQuote] = useState(0)
  
  const aiQuotes = [
    "AI amplifies everything. Urgency becomes precision. Showmanship becomes impact. Energy becomes unstoppable force.",
    "The future is built by those who combine human intuition with machine intelligence.",
    "Every problem is a data point. Every solution is a pattern. Every breakthrough is inevitable.",
    "Speed of thought, scale of machines, soul of a creator. This is the new paradigm."
  ]
  
  const handleQuoteChange = () => {
    setCurrentQuote(prev => (prev + 1) % aiQuotes.length)
  }

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
            Energy <span className="text-orange-500">+</span> AI
          </motion.h2>
          
          <motion.div 
            variants={containerVariants}
            className="space-y-12 max-w-3xl mx-auto"
          >
            <motion.div variants={textVariants} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-black mb-4 leading-tight">
                I lead with energy. I use <span className="text-orange-500">AI</span> in everything I do.
              </p>
              <p className="text-lg md:text-xl text-gray-600 font-light leading-relaxed">
                Energy is contagious. AI is multiplying. Together, they create 
                exponential impact that transforms ideas into reality.
              </p>
            </motion.div>
            
            <motion.div variants={textVariants} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-black mb-4 leading-tight">
                If you don't embrace both, you're already behind.
              </p>
              <p className="text-lg md:text-xl text-gray-600 font-light leading-relaxed">
                The future belongs to those who combine human passion with machine precision. 
                Adaptation isn't optional—it's survival.
              </p>
            </motion.div>
            
            <motion.div 
              variants={textVariants}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 cursor-pointer"
              onClick={handleQuoteChange}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <motion.p
                key={currentQuote}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-xl md:text-2xl font-light text-black leading-relaxed text-center italic"
              >
                "{aiQuotes[currentQuote]}"
              </motion.p>
              <p className="text-sm text-gray-500 text-center mt-4">
                Click for another insight
              </p>
            </motion.div>
            
            <motion.div variants={textVariants} className="text-center">
              <p className="text-3xl md:text-4xl font-black text-black mb-4 leading-tight">
                Results first. Rewards follow.
              </p>
              <p className="text-lg md:text-xl text-gray-600 font-light leading-relaxed">
                Excellence isn't negotiable. Impact is measurable. Success is inevitable 
                when energy meets intelligence.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
            transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
            className="w-24 h-1 bg-orange-500 mx-auto"
          />
        </motion.div>
      </div>
    </section>
  )
}