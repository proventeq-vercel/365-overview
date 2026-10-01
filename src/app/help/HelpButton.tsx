import { ExternalLink } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { helpUrl } from '@/config/helpPath'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { helpCatalogue } from './helpContent'
import { HELP_TOPICS, type HelpTopic } from './topics'

export function HelpButton({ topic }: { topic: HelpTopic }) {
  const t = useTranslation()
  const slug = HELP_TOPICS[topic]
  const page = helpCatalogue.page(slug)
  if (!page) throw new Error(`No help page for topic "${topic}" (${slug})`)
  return (
    <Dialog>
      <DialogTrigger
        aria-label={t('helpButton.label', { title: page.title })}
        title={t('helpButton.label', { title: page.title })}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-p365-grey-400 text-xs leading-none font-bold text-p365-grey-400 transition-colors duration-150 ease-out hover:border-p365-grey-600 hover:text-p365-grey-600 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        ?
      </DialogTrigger>
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
        <DialogTitle>{page.title}</DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-relaxed text-p365-grey-600">
          {page.description}
        </DialogDescription>
        <div className="mt-4 flex justify-end">
          <a
            href={helpUrl(page.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-p365-teal')}
          >
            {t('helpButton.seeMore')}
            <ExternalLink aria-hidden="true" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
