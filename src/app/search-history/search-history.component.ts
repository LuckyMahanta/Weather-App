import { Component, Input, Output, EventEmitter } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-search-history',
  templateUrl: './search-history.component.html',
  styleUrls: ['./search-history.component.css'],
  animations: [
    trigger('slideInOut', [
      transition('void => *', [
        style({ transform: 'translateX(-100%)' }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)' }))
      ]),
      transition('* => void', [
        animate('300ms ease-out', style({ transform: 'translateX(-100%)' }))
      ])
    ])
  ]
})

export class SearchHistoryComponent {
  @Input() weatherHistory: any[] = [];
  @Output() remove = new EventEmitter<number>();
  @Output() selectHistory = new EventEmitter<any>();

  onRemove(index: number) {
    this.remove.emit(index);
  }

  onSelect(historyItem: any){
    this.selectHistory.emit(historyItem);
  }
}
