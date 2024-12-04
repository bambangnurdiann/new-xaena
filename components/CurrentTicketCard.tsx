import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Send } from 'lucide-react'

interface Ticket {
  Incident: string
  "Detail Case"?: string
  Analisa?: string
  "Escalation Level"?: string
  category?: string
  level?: string
  SID?: string
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

const CurrentTicketCard: React.FC<CurrentTicketCardProps> = ({
  ticket,
  detailCase,
  setDetailCase,
  analisa,
  setAnalisa,
  escalationLevel,
  setEscalationLevel,
  availableLevels,
  handleSubmit
}) => {
  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Current Ticket</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-gray-600">Incident</p>
            <p className="text-lg">{ticket.Incident}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-600">Category</p>
            <Badge variant={ticket.category === 'K1' ? 'destructive' : ticket.category === 'K2' ? 'secondary' : 'default'}>
              {ticket.category}
            </Badge>
          </div>
          <div>
            <p className="font-semibold text-gray-600">Current Level</p>
            <Badge variant="outline">{ticket.level}</Badge>
          </div>
          <div>
            <p className="font-semibold text-gray-600">SID</p>
            <p>{ticket.SID || 'N/A'}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <label htmlFor="detailCase" className="block font-semibold text-gray-700 mb-2">
              Detail Case
            </label>
            <Textarea
              id="detailCase"
              value={detailCase}
              onChange={(e) => setDetailCase(e.target.value)}
              className="min-h-[100px] w-full"
              placeholder="Enter case details..."
            />
          </div>
          <div>
            <label htmlFor="analisa" className="block font-semibold text-gray-700 mb-2">
              Analisa
            </label>
            <Textarea
              id="analisa"
              value={analisa}
              onChange={(e) => setAnalisa(e.target.value)}
              className="min-h-[100px] w-full"
              placeholder="Enter analysis..."
            />
          </div>
          <div>
            <label htmlFor="escalationLevel" className="block font-semibold text-gray-700 mb-2">
              Escalation Level
            </label>
            <Select onValueChange={setEscalationLevel} value={escalationLevel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Escalation Level" />
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
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 flex justify-end space-x-4 p-4">
        <Button onClick={handleSubmit} variant="default">
          <Send className="mr-2 h-4 w-4" /> Submit Changes
        </Button>
      </CardFooter>
    </Card>
  )
}

export default CurrentTicketCard