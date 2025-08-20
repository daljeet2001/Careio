import Navbar from '../components/ui/navbar.jsx'

const LandingPage = () => {
  return (
    <div
      className="w-full h-screen bg-cover bg-center bg-fixed"
  
    >
      <Navbar />
      <div className="flex flex-col items-center justify-center h-full p-4">
        <h1 className="text-6xl font-bold font-bebas text-black text-center">
          Keep Your Loved Ones Safe, Wherever They Are
        </h1>
        <p className="text-lg font-bebas text-black mt-4">
          Track | Safe Zones | Alerts
        </p>
      </div>
    </div>
  )
}

export default LandingPage
