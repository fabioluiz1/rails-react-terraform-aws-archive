module Api
  module V1
    class RewardsController < ApplicationController
      include Pagination

      # Returns only available rewards (unavailable rewards are excluded)
      def index
        rewards = Reward.available
          .order(:points_cost)
          .limit(limit)
          .offset(offset)

        render json: RewardResource.new(rewards).serializable_hash
      end

    end
  end
end
