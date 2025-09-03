import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'

export default function OutroSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const [isCommitted, setIsCommitted] = useState(false)
  
  const handleCommitment = () => {
    setIsCommitted(true)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.4,
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
    <section ref={ref} className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-5xl mx-auto px-8 py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="text-center space-y-16"
        >
          <motion.h2 
            variants={textVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[0.85] text-white tracking-[-0.02em]"
          >
            This is my manifesto.
          </motion.h2>
          
          <motion.div
            variants={containerVariants}
            className="space-y-12 max-w-4xl mx-auto"
          >
            <motion.div 
              variants={textVariants}
              className="cursor-pointer"
              onClick={handleCommitment}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <motion.p 
                className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight"
                animate={isCommitted ? { color: ["#ffffff", "#22c55e", "#ffffff"] } : {}}
                transition={{ duration: 1 }}
              >
                If these values feel like you, you're in the right place.
              </motion.p>
              <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed">
                You understand that excellence isn't an accident. You know that impact 
                requires intention. You believe in the power of uncompromising standards.
                {isCommitted && (
                  <span className="text-green-400 font-normal"> Let's build something extraordinary.</span>
                )}
              </p>
            </motion.div>
            
            <motion.div variants={textVariants}>
              <p className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                If not, we'll both know fast.
              </p>
              <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed">
                These aren't suggestions. They're requirements for extraordinary collaboration. 
                Not everyone operates at this level—and that's exactly what makes the difference.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            variants={textVariants}
            className="bg-gray-900 rounded-2xl p-12 border border-gray-800 max-w-4xl mx-auto"
          >
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.2,
                    delayChildren: 1
                  }
                }
              }}
            >
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="text-center"
              >
                <div className="text-3xl mb-4 text-red-500">⚡</div>
                <p className="text-red-500 font-bold text-lg mb-3">Urgency</p>
                <p className="text-gray-400 text-sm leading-relaxed">Move fast. Act now. Time is the ultimate currency.</p>
              </motion.div>
              
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="text-center"
              >
                <div className="text-3xl mb-4 text-blue-500">✨</div>
                <p className="text-blue-500 font-bold text-lg mb-3">Showmanship</p>
                <p className="text-gray-400 text-sm leading-relaxed">Build, demo, prove. Actions over explanations.</p>
              </motion.div>
              
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="text-center"
              >
                <div className="text-3xl mb-4 text-orange-500">🧠</div>
                <p className="text-orange-500 font-bold text-lg mb-3">Energy + AI</p>
                <p className="text-gray-400 text-sm leading-relaxed">Human passion meets machine precision. Unstoppable.</p>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 2, duration: 1, ease: "easeOut" }}
            className="flex justify-center pt-8"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="w-6 h-6 bg-white rounded-full relative flex items-center justify-center"
            >
              <div className="w-1.5 h-1.5 bg-black rounded-full" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}