var appCarousel = this;

$(appCarousel).owlCarousel({
  items: 1,
  nav: true,
  autoplay: true,
  loop: true,
  onInitialized: function () {
    // .app-carousel__item
    $('.app-carousel__item').each(function () {
      $(this).css('background-image', 'url(' + $(this).data('image') + ')');
    });

    // .app-carousel__nav
    $(appCarousel).find('.owl-nav').addClass('app-carousel__nav');
    // $(appCarousel).find('.owl-nav').width($(appCarousel).height());
    $(appCarousel).find('.owl-nav .owl-prev').addClass('app-carousel__nav-prev');
    $(appCarousel).find('.owl-nav .owl-prev').html('<i class="fas fa-long-arrow-alt-left"></i>');
    $(appCarousel).find('.owl-nav .owl-next').addClass('app-carousel__nav-next');
    $(appCarousel).find('.owl-nav .owl-next').html('<i class="fas fa-long-arrow-alt-right"></i>');
    $('<span class="app-carousel__nav-text">Featured Article</span>').insertAfter('.app-carousel__nav-prev');
  }
});
