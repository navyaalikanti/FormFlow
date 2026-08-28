import Navbar from '../components/navbar/Navbar'
import Footer from '../components/footer/Footer'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Navbar />
      {children}
      <Footer />
    </div>
  )
}
