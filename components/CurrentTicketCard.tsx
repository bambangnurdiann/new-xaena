import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send } from 'lucide-react'

interface Ticket {
  Incident: string
  category?: string  // Changed to lowercase to match the data structure
  "Detail Case"?: string
  Analisa?: string
  "Escalation Level"?: string
  SID?: string
  level?: string
}

interface CurrentTicketCardProps {
  ticket: Ticket
  detailCase: string
  setDetailCase: (value: string) => void
  analisa: string
  setAnalisa: (value: string) => void
  escalationLevel: string
  setEscalationLevel: (value: string) => void
  availableLevels: string[]
  handleSubmit: () => void
}

export default function CurrentTicketCard({
  ticket,
  detailCase,
  setDetailCase,
  analisa,
  setAnalisa,
  escalationLevel,
  setEscalationLevel,
  availableLevels,
  handleSubmit
}: CurrentTicketCardProps) {
  const getCategoryVariant = (category?: string) => {
    switch (category) {
      case 'K1':
        return 'destructive'
      case 'K2':
        return 'secondary'
      default:
        return 'default'
    }
  }

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <CardTitle>Current Ticket</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="incident">Incident</Label>
            <Input
              id="incident"
              value={ticket.Incident}
              readOnly
              className="border-0 px-0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <div className="flex items-center h-10">
              <Badge 
                variant={getCategoryVariant(ticket.category)}
                className="text-sm font-medium"
              >
                {ticket.category}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentLevel">Current Level</Label>
            <div className="flex items-center h-10">
              <Badge 
                variant="outline"
                className="text-sm font-medium"
              >
                {ticket.level}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sid">SID</Label>
            <Input
              id="sid"
              value={ticket.SID || ''}
              readOnly
              className="border-0 px-0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="detailCase">Detail Case</Label>
          <Textarea
            id="detailCase"
            value={detailCase}
            onChange={(e) => setDetailCase(e.target.value)}
            className="min-h-[100px] bg-background"
            placeholder="Enter case details..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="analisa">Analisa</Label>
          <Textarea
            id="analisa"
            value={analisa}
            onChange={(e) => setAnalisa(e.target.value)}
            className="min-h-[100px] bg-background"
            placeholder="Enter analysis..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="escalationLevel">Escalation Level</Label>
          <Select value={escalationLevel} onValueChange={setEscalationLevel}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select escalation level" />
            </SelectTrigger>
            <SelectContent>
              {availableLevels.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} className="ml-auto">
          <Send className="mr-2 h-4 w-4" />
          Submit Changes
        </Button>
      </CardFooter>
    </Card>
  )
}

