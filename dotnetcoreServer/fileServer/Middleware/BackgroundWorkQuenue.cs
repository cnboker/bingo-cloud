using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

public class BackgroundWorkQuenue{
    private ConcurrentQueue<Func<CancellationToken, Task>> workItems = new ConcurrentQueue<Func<CancellationToken, Task>>();
    private SemaphoreSlim signal = new SemaphoreSlim(0);

    public async Task<Func<CancellationToken,Task>> DequeueAsync(CancellationToken cancellationToken){
        await signal.WaitAsync(cancellationToken);
        workItems.TryDequeue(out var workItem);
        return workItem;
    }
    
    public void QueueBackgroundWorkItem(Func<CancellationToken,Task> workItem){
        if(workItem == null){
            throw new ArgumentException(nameof(workItem));
        }
        workItems.Enqueue(workItem);
        signal.Release();
    }

}