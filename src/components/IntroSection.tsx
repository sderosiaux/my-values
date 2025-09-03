import { motion } from 'framer-motion'

export default function IntroSection() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-white">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-5xl mx-auto px-8"
      >
        <motion.h1
          className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black leading-[0.85] text-black tracking-[-0.02em] mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          This is me.
        </motion.h1>
        
        <motion.div
          className="space-y-8 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="text-2xl md:text-3xl font-semibold text-black leading-relaxed">
            <p className="mb-4">These are my values.</p>
            <p>They define who I want to work with.</p>
          </div>
          
          <motion.div 
            className="text-lg md:text-xl text-gray-600 font-light leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <p className="mb-6">
              This isn't about conformity—it's about alignment. It's a filter for finding 
              people who naturally operate at this level.
            </p>
            <p>
              If these values resonate with you, we're meant to collaborate. 
              If not, we'll both know quickly.
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-16 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <motion.div
            animate={{ 
              y: [0, 8, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center p-2"
          >
            <div className="w-1 h-3 bg-gray-400 rounded-full" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}