class Api::V1::Admin::RedemptionsController < ApplicationController
  include Pagination
  
  def index
    redemptions = Redemption.all
      .includes(:reward)
      .order(redeemed_at: :desc)
      .limit(limit)
      .offset(offset)

    render json: RedemptionResource.new(redemptions).serializable_hash
  end
end
