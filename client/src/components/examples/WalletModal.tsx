import WalletModal from '../WalletModal'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function WalletModalExample() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)}>Open Wallet Modal</Button>
      <WalletModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConnect={(wallet) => {
          console.log('Connected to:', wallet)
          setIsOpen(false)
        }}
      />
    </div>
  )
}