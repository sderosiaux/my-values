import IntroSection from './components/IntroSection'
import UrgencySection from './components/UrgencySection'
import ShowmanshipSection from './components/ShowmanshipSection'
import EnergyAISection from './components/EnergyAISection'
import OutroSection from './components/OutroSection'

function App() {
  return (
    <div className="bg-white text-black font-inter">
      <IntroSection />
      <UrgencySection />
      <ShowmanshipSection />
      <EnergyAISection />
      <OutroSection />
    </div>
  )
}

export default App