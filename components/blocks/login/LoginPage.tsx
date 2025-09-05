import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import VideoBackground from '@/components/VideoBackground'
import backgroundVideo from '@/videos/background_login.mp4'
import Image from "next/image"
import { CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen min-h-dvh w-full overflow-hidden bg-black" data-page="login">
      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full bg-black">
        <VideoBackground src={backgroundVideo} />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-md flex-col gap-4">
           <div className="flex items-center justify-center">
           <p className="text-2xl font-light font- text-white mb-2">Welcome! 👋</p>

          
           </div>
          
          <LoginForm />
        </div>
      </div>
    </div>
  )
}