import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { MobileDock } from './components/MobileDock'
import { BrandsTile } from './components/tiles/BrandsTile'
import { ConnectTile } from './components/tiles/ConnectTile'
import { CouponsTile } from './components/tiles/CouponsTile'
import { FeaturedTile } from './components/tiles/FeaturedTile'
import { NowTile } from './components/tiles/NowTile'
import { LocalTile } from './components/tiles/LocalTile'
import { PixTile } from './components/tiles/PixTile'
import { PartnershipTile } from './components/tiles/PartnershipTile'
import { QrTile } from './components/tiles/QrTile'
import { SocialTiles } from './components/tiles/SocialTiles'
import { TopBar } from './components/TopBar'
import { SimpleCard } from './components/SimpleCard'
import { creator } from './config/creator'
import { useReveal } from './lib/motion'

/**
 * Composition
 *  mobile  : top bar → card → bio + actions → conecta → socials 2×2 → featured → partnership → now
 *  tablet  : card and bio side by side, tiles below
 *  Cada estilo (config.style) recompõe isto em CSS pelas classes layout/hero-col/tiles/t-* (index.css).
 *  desktop : the card stays pinned on the left (5 cols) while the tiles scroll on the right (7 cols):
 *            featured · socials 2×2 · partnership · now | QR
 */
export default function App() {
  useReveal()
  if (creator.style === 'simples') return <SimpleCard />
  const hasNow = !!creator.now

  return (
    <>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10">
        <TopBar />
        <div className="layout lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
          <Hero className="hero-col lg:top-6 lg:[@media(min-height:44rem)]:sticky lg:col-span-5" />
          <main className="tiles mt-10 grid grid-cols-2 gap-3 md:mt-12 lg:col-span-7 lg:mt-0">
            <ConnectTile className="col-span-2" />
            <SocialTiles className="t-social order-1 col-span-2 lg:order-2" />
            <FeaturedTile className="t-featured order-2 col-span-2 lg:order-1" />
            <LocalTile className="t-local order-3 col-span-2" />
            <PixTile className="t-pix order-3 col-span-2" />
            <CouponsTile className="t-coupons order-3 col-span-2" />
            <PartnershipTile className="t-pship order-3 col-span-2" />
            <NowTile className={`t-now order-4 col-span-2 ${hasNow ? 'lg:col-span-1' : ''}`} />
            <QrTile className={`t-qr order-5 hidden lg:flex ${hasNow ? 'lg:col-span-1' : 'lg:col-span-2'}`} />
            <BrandsTile className="t-brands order-6 col-span-2" />
          </main>
        </div>
        <Footer />
      </div>
      <MobileDock />
    </>
  )
}
