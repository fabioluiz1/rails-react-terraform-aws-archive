module Pagination
  extend ActiveSupport::Concern

  DEFAULT_LIMIT = 20
  MAX_LIMIT = 100

  private

  def limit
    [ [ params.fetch(:limit, DEFAULT_LIMIT).to_i, 1 ].max, MAX_LIMIT ].min
  end

  def offset
    [ params.fetch(:offset, 0).to_i, 0 ].max
  end
end
