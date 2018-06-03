import _ from 'lodash';
import $ from 'jquery';
import './css/style.css';

$('.btn-toggle').click(function() {
  $(this).toggleClass('toggled');
});