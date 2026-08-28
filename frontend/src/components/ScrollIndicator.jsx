export default function ScrollIndicator() {
  const handleClick = () => {
    const heroSection = document.getElementById('hero')
    const nextSection = heroSection?.nextElementSibling

    if (nextSection instanceof HTMLElement) {
      window.scrollTo({
        top: nextSection.offsetTop,
        behavior: 'smooth',
      })
    }
  }

  return (
    <button
      type="button"
      aria-label="Scroll Down"
      onClick={handleClick}
      className="scroll-indicator group relative flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none"
    >
      <span className="scroll-indicator-mouse">
        <span className="scroll-indicator-dot" />
      </span>
    </button>
  )
}
