import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { helpHref, isExternalHref, isPlainClick, resolveDocLink } from './links'

const REMARK_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS = [rehypeSlug]

export function HelpMarkdown({
  body,
  file,
  basePath,
  query,
  onNavigate,
}: {
  body: string
  file: string
  basePath: string
  query: string
  onNavigate: (href: string) => void
}) {
  const components: Components = {
    a({ href = '', children, node: _node, ...props }) {
      const target = resolveDocLink(file, href)
      if (target) {
        const internal = helpHref(basePath, target, query)
        return (
          <a
            {...props}
            href={internal}
            onClick={(event) => {
              if (!isPlainClick(event)) return
              event.preventDefault()
              onNavigate(internal)
            }}
          >
            {children}
          </a>
        )
      }
      const external = isExternalHref(href) && !href.startsWith('mailto:')
      return (
        <a {...props} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {children}
        </a>
      )
    },
    table({ node: _node, ...props }) {
      return (
        <div className="hc-table-scroll">
          <table {...props} />
        </div>
      )
    },
  }
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS} components={components}>
      {body}
    </ReactMarkdown>
  )
}
