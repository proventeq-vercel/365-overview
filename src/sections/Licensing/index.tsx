import { useLicenses } from '../../hooks/useReports'
import { KpiCard } from '../../components/KpiCard'
import { DataTable } from '../../components/DataTable'
import { ConsumptionBar } from '../../components/ConsumptionBar'
import { ErrorState } from '../../components/ErrorState'
import { SkeletonCard } from '../../components/SkeletonCard'
import { formatNumber } from '../../lib/format'

const SKU_COLUMNS = [
  { key: 'skuPartNumber', header: 'SKU' },
  { key: 'consumed', header: 'Consumed' },
  { key: 'enabled', header: 'Enabled' },
  { key: 'available', header: 'Available' },
]

export function Licensing() {
  const { data, isError, error } = useLicenses()

  return (
    <section className="page">
      <h1 className="page__title">Licensing</h1>

      {isError ? (
        <ErrorState error={error} />
      ) : !data ? (
        <div className="card-grid">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <div className="card-grid">
            <KpiCard
              label="Seats consumed"
              value={formatNumber(data.reduce((a, s) => a + s.consumed, 0))}
            />
            <KpiCard
              label="Seats available"
              value={formatNumber(data.reduce((a, s) => a + s.available, 0))}
            />
          </div>

          <DataTable
            columns={SKU_COLUMNS}
            rows={data.map((sku) => ({
              skuPartNumber: sku.skuPartNumber,
              consumed: formatNumber(sku.consumed),
              enabled: formatNumber(sku.enabled),
              available: formatNumber(sku.available),
            }))}
          />

          <div className="page">
            {data.map((sku) => (
              <ConsumptionBar
                key={sku.skuId}
                used={sku.consumed}
                total={sku.enabled}
                label={sku.skuPartNumber}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
