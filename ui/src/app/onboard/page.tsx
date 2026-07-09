import { OnboardWizard } from "@/components/onboard-wizard"
import { OnboardedGuard } from "@/components/onboarded-guard"

export default function OnboardPage() {
  return (
    <>
      <OnboardedGuard />
      <OnboardWizard />
    </>
  )
}
