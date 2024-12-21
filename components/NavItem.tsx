<<<<<<< HEAD
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  isOpen: boolean;
}

export function NavItem({ href, icon: Icon, label, isOpen }: NavItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href={href} className="flex items-center py-2 px-3 rounded-lg">
            <Icon className="w-5 h-5" />
            {isOpen && <span className="ml-3">{label}</span>}
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className={isOpen ? 'hidden' : ''}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

=======
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  isOpen: boolean;
}

export function NavItem({ href, icon: Icon, label, isOpen }: NavItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href={href} className="flex items-center py-2 px-3 rounded-lg">
            <Icon className="w-5 h-5" />
            {isOpen && <span className="ml-3">{label}</span>}
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className={isOpen ? 'hidden' : ''}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

>>>>>>> f346677 (Fix Bug)
