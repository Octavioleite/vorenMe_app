import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { MobileDock } from './components/MobileDock'
import { BrandsTile } from './components/tiles/BrandsTile'
import { CouponsTile } from './components/tiles/CouponsTile'
import { FeaturedTile } from './components/tiles/FeaturedTile'
import { NowTile } from './components/tiles/NowTile'
import { PartnershipTile } from './components/tiles/PartnershipTile'
import { QrTile } from './components/tiles/QrTile'
import { SocialTiles } from './components/tiles/SocialTiles'
import { TopBar } from './components/TopBar'
import { creator } from './config/creator'
import { useReveal } from './lib/motion'

/**
 * Composition
 *  mobile  : top bar → card → bio + actions → socials 2×2 → featured → partnership → now
 *  tablet  : card and bio side by side, tiles below
 *  desktop : the card stays pinned on the left (5 cols) while the tiles scroll on the right (7 cols):
 *            featured · socials 2×2 · partnership · now | QR
 */
export default function App() {
  useReveal()
  const hasNow = !!creator.now

  return (
    <>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10">
        <TopBar />
        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
          <Hero className="lg:sticky lg:top-6 lg:col-span-5" />
          <main className="mt-10 grid grid-cols-2 gap-3 md:mt-12 lg:col-span-7 lg:mt-0">
            <SocialTiles className="order-1 col-span-2 lg:order-2" />
            <FeaturedTile className="order-2 col-span-2 lg:order-1" />
            <CouponsTile className="order-3 col-span-2" />
            <PartnershipTile className="order-3 col-span-2" />
            <NowTile className={`order-4 col-span-2 ${hasNow ? 'lg:col-span-1' : ''}`} />
            <QrTile className={`order-5 hidden lg:flex ${hasNow ? 'lg:col-span-1' : 'lg:col-span-2'}`} />
            <BrandsTile className="order-6 col-span-2" />
          </main>
        </div>
        <Footer />
      </div>
      <MobileDock />
    </>
  )
}
