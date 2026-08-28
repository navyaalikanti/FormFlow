import { useContext, useEffect, useState } from 'react'
import { ThemeContext } from '../context/ThemeContext'

/**
 * HeroWorkflowIllustration
 * Displays theme-aware workflow illustration on the landing page hero section
 * - Light theme: Shows Light workflow image
 * - Dark theme: Shows Dark workflow image
 * - Smooth fade transition when theme changes
 */
export default function HeroWorkflowIllustration() {
  const { theme } = useContext(ThemeContext)
  const [fadeIn, setFadeIn] = useState(true)

  // Trigger fade animation when theme changes
  useEffect(() => {
    setFadeIn(false)
    const timer = setTimeout(() => setFadeIn(true), 150)
    return () => clearTimeout(timer)
  }, [theme])

  // Import images from assets folder
  // Light theme image
  const lightWorkflowImage = '/assets/workflow-light.jpeg'
  // Dark theme image
  const darkWorkflowImage = '/assets/workflow-dark.jpeg'

  const currentImage = theme === 'dark' ? darkWorkflowImage : lightWorkflowImage

  return (
    <div className="relative flex items-center justify-center lg:justify-end h-full w-full">
      {/* Workflow illustration container - wider and shorter dimensions */}
      <div
        className={`
          relative w-full
          flex items-center justify-center
          transition-opacity duration-300
          translate-x-8 lg:translate-x-12
          ${fadeIn ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <img
          src={currentImage}
          alt="Form workflow illustration"
          className="
            w-full max-w-[650px]
            max-h-[500px]
            object-contain
            rounded-lg
            select-none pointer-events-none
          "
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  )
}
