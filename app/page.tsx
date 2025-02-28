import CryptoBubbles from "@/components/crypto-bubbles"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-[#0a192f] text-white">
      <div className="w-full">
        <CryptoBubbles />
      </div>
    </main>
  )
}

